import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_STORAGE_BUCKET',
] as const;

/** Prefijos/fragmentos típicos de un valor de marcador que nunca es real. */
const PLACEHOLDER_PATTERNS = [/^tu_/i, /^your_/i, /xxx/i];

function looksLikePlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

/** Corta llamadas colgadas a la API de Storage — mismo criterio que el
 *  fetch resiliente del frontend (lib/api/http.ts). */
const STORAGE_TIMEOUT_MS = 15_000;

export interface SignedUploadTarget {
  /** URL absoluta a la que el NAVEGADOR hace PUT del archivo (lleva `?token=`
   *  embebido — el navegador no necesita cabecera de autorización). */
  uploadUrl: string;
  /** Ruta del objeto dentro del bucket, tal como quedará en storagePath. */
  path: string;
}

export interface StorageObjectInfo {
  /** Tamaño real en bytes que reporta Storage. */
  sizeBytes: number;
  /** Content-Type real que reporta Storage. */
  contentType: string;
}

/**
 * Envoltorio delgado sobre la API REST de Supabase Storage (sin SDK, mismo
 * estilo que CloudinaryService). Cloudinary se queda con las imágenes de
 * órdenes; los DOCUMENTOS de equipo (PDF grandes, privados) van acá porque
 * las transformaciones de Cloudinary no aplican a un PDF, su plan gratuito
 * corta en 10 MB y Supabase entrega enlaces firmados con vencimiento igual.
 *
 * La `service_role_key` es de MÁXIMO privilegio (salta las políticas RLS):
 * vive SOLO en este servicio del backend, nunca en Next ni en el navegador.
 * Toda subida del navegador va contra una URL firmada de un solo uso que
 * emite este servicio, nunca con la llave.
 *
 * Configuración PEREZOSA (al primer uso), nunca en el constructor: si
 * faltan variables, el error aparece cuando alguien sube un archivo, no al
 * arrancar el servidor. `onModuleInit` deja una advertencia en los logs de
 * arranque si detecta variables ausentes o con valor de marcador.
 *
 * BUCKET — se crea a mano en el panel de Supabase (Storage → New bucket),
 * PRIVADO, con `file_size_limit` y `allowed_mime_types` (ver DEPLOY.md y
 * equipment-file.constants.ts). Este servicio nunca lo crea.
 */
@Injectable()
export class SupabaseStorageService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);

  onModuleInit(): void {
    const problems: string[] = [];

    for (const name of REQUIRED_ENV_VARS) {
      const value = process.env[name];
      if (!value) {
        problems.push(`${name} falta`);
      } else if (looksLikePlaceholder(value)) {
        problems.push(`${name} tiene un valor de marcador ("${value}")`);
      }
    }

    if (problems.length > 0) {
      this.logger.warn(
        `Supabase Storage mal configurado — la subida de archivos de equipo ` +
          `fallará hasta corregirlo en Railway: ${problems.join(', ')}`,
      );
    }
  }

  /**
   * Pide a Storage una URL firmada de subida para `path`. De un solo uso y
   * vigencia corta (~2 h, la impone Supabase). El navegador hace PUT del
   * archivo directo ahí — nunca pasa por Next ni por este backend.
   */
  async createSignedUploadUrl(path: string): Promise<SignedUploadTarget> {
    const { baseUrl, key, bucket } = this.config();

    const response = await this.request(
      `${baseUrl}/storage/v1/object/upload/sign/${bucket}/${encodePath(path)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );

    if (!response.ok) {
      throw await this.remoteError('firmar la subida', response);
    }

    const data = (await response.json().catch(() => null)) as {
      url?: string;
    } | null;

    if (!data?.url) {
      throw new InternalServerErrorException(
        'Supabase no devolvió la URL firmada de subida',
      );
    }

    // `data.url` llega como "/object/upload/sign/<bucket>/<path>?token=<jwt>"
    // (o sin la barra inicial). Se normaliza a URL absoluta bajo /storage/v1.
    const relative = data.url.startsWith('/') ? data.url : `/${data.url}`;
    return { uploadUrl: `${baseUrl}/storage/v1${relative}`, path };
  }

  /**
   * Metadatos AUTORITATIVOS del objeto ya subido (tamaño y tipo reales, no
   * los que declaró el navegador). Devuelve null si el objeto no existe —
   * el llamador lo trata como "el archivo no se subió".
   */
  async getObjectInfo(path: string): Promise<StorageObjectInfo | null> {
    const { baseUrl, key, bucket } = this.config();

    const response = await this.request(
      `${baseUrl}/storage/v1/object/info/${bucket}/${encodePath(path)}`,
      { headers: { Authorization: `Bearer ${key}`, apikey: key } },
    );

    // 404: el objeto no existe. 400/405: esta versión de Storage no expone
    // /object/info — se cae al listado, que existe en todas.
    if (response.status === 404) {
      return null;
    }
    if (response.status === 400 || response.status === 405) {
      return this.getObjectInfoViaList(path);
    }
    if (!response.ok) {
      throw await this.remoteError('consultar el archivo subido', response);
    }

    const raw = await response.text().catch(() => '');
    return this.parseObjectInfo('object/info', path, raw);
  }

  /** Respaldo de getObjectInfo cuando /object/info no está disponible. */
  private async getObjectInfoViaList(
    path: string,
  ): Promise<StorageObjectInfo | null> {
    const { baseUrl, key, bucket } = this.config();
    const lastSlash = path.lastIndexOf('/');
    const prefix = lastSlash >= 0 ? path.slice(0, lastSlash) : '';
    const name = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;

    const response = await this.request(
      `${baseUrl}/storage/v1/object/list/${bucket}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefix, search: name, limit: 1 }),
      },
    );

    if (!response.ok) {
      throw await this.remoteError('consultar el archivo subido', response);
    }

    const rows = (await response.json().catch(() => null)) as Array<
      Record<string, unknown>
    > | null;
    const match = rows?.find((row) => row.name === name);
    if (!match) return null;

    return this.parseObjectInfo('object/list', path, JSON.stringify(match));
  }

  /**
   * Extrae tamaño y tipo de la respuesta de Storage. La API es
   * inconsistente entre endpoints y versiones: `mimetype` en /object/list,
   * `contentType` en /object/info, a veces anidado en `metadata`, a veces
   * snake_case. Se cubren esas variantes por nombre y, como último recurso,
   * se busca en todo el objeto el primer valor con forma de MIME.
   *
   * Se registra la respuesta CRUDA siempre: sin eso, un "tipo no permitido"
   * es imposible de diagnosticar (¿leímos mal, o se guardó mal?).
   */
  private parseObjectInfo(
    source: string,
    path: string,
    rawBody: string,
  ): StorageObjectInfo | null {
    this.logger.log(`getObjectInfo(${path}) vía ${source}: ${rawBody}`);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return null;
    }
    if (!parsed || typeof parsed !== 'object') return null;

    const data = parsed as Record<string, unknown>;
    const metadata = (data.metadata ?? {}) as Record<string, unknown>;

    const rawSize =
      data.size ??
      data.contentLength ??
      data.content_length ??
      metadata.size ??
      metadata.contentLength ??
      metadata.content_length;

    const rawType =
      firstString([
        data.contentType,
        data.mimetype,
        data.mime_type,
        data.content_type,
        metadata.contentType,
        metadata.mimetype,
        metadata.mime_type,
        metadata.content_type,
      ]) ??
      findMimeLike(data) ??
      findMimeLike(metadata);

    const sizeBytes = Number(rawSize);
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      this.logger.warn(
        `getObjectInfo(${path}): no se pudo leer un tamaño válido de la respuesta de Storage`,
      );
      return null;
    }

    if (!rawType) {
      this.logger.warn(
        `getObjectInfo(${path}): la respuesta de Storage no trae ningún tipo MIME reconocible — se usará application/octet-stream`,
      );
    }

    return {
      sizeBytes,
      contentType: rawType ?? 'application/octet-stream',
    };
  }

  /**
   * URL de descarga firmada con vencimiento (`expiresInSeconds`). El bucket
   * es privado: sin esta firma, el objeto no se puede abrir. `downloadName`
   * fuerza `Content-Disposition: attachment` con ese nombre.
   */
  async createSignedDownloadUrl(
    path: string,
    expiresInSeconds: number,
    downloadName: string,
  ): Promise<string> {
    const { baseUrl, key, bucket } = this.config();

    const response = await this.request(
      `${baseUrl}/storage/v1/object/sign/${bucket}/${encodePath(path)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: expiresInSeconds }),
      },
    );

    if (!response.ok) {
      throw await this.remoteError('firmar la descarga', response);
    }

    const data = (await response.json().catch(() => null)) as {
      signedURL?: string;
      signedUrl?: string;
    } | null;

    const signed = data?.signedURL ?? data?.signedUrl;
    if (!signed) {
      throw new InternalServerErrorException(
        'Supabase no devolvió la URL firmada de descarga',
      );
    }

    const relative = signed.startsWith('/') ? signed : `/${signed}`;
    const sep = relative.includes('?') ? '&' : '?';
    return `${baseUrl}/storage/v1${relative}${sep}download=${encodeURIComponent(
      downloadName,
    )}`;
  }

  /**
   * Borrado en Storage: SIEMPRE best-effort. Si Supabase falla acá, no
   * tumbamos la operación local — el peor caso es un objeto huérfano
   * (invisible, unos bytes), nunca una fila rota. Mismo criterio que
   * CloudinaryService.destroy.
   */
  async remove(path: string): Promise<void> {
    let baseUrl: string;
    let key: string;
    let bucket: string;
    try {
      ({ baseUrl, key, bucket } = this.config());
    } catch {
      return;
    }

    try {
      const response = await this.request(
        `${baseUrl}/storage/v1/object/${bucket}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${key}`,
            apikey: key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefixes: [path] }),
        },
      );
      if (!response.ok) {
        this.logger.warn(
          `No se pudo borrar el objeto ${path} en Supabase (HTTP ${response.status}) — queda huérfano`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo borrar el objeto ${path} en Supabase: ${
          error instanceof Error ? error.message : String(error)
        } — queda huérfano`,
      );
    }
  }

  private config(): { baseUrl: string; key: string; bucket: string } {
    const baseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;

    if (!baseUrl || !key || !bucket) {
      throw new InternalServerErrorException(
        'Supabase Storage no está configurado en el servidor: faltan ' +
          'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o SUPABASE_STORAGE_BUCKET',
      );
    }

    return { baseUrl: baseUrl.replace(/\/$/, ''), key, bucket };
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STORAGE_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      throw new InternalServerErrorException(
        `No se pudo contactar a Supabase Storage: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private async remoteError(
    action: string,
    response: Response,
  ): Promise<InternalServerErrorException> {
    const detail = await response.text().catch(() => '');
    this.logger.error(
      `Supabase Storage falló al ${action} (HTTP ${response.status}): ${detail}`,
    );
    return new InternalServerErrorException(
      `No se pudo ${action} en nuestro proveedor de almacenamiento. ` +
        'Intenta de nuevo en unos minutos; si persiste, contacta al administrador.',
    );
  }
}

/** Codifica cada segmento de la ruta sin tocar las barras. */
function encodePath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/** Primer valor de la lista que sea un string no vacío. */
function firstString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

const MIME_LIKE = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;

/** Último recurso: el primer valor con forma de tipo MIME dentro del objeto
 *  (ej. "application/pdf"), sin importar bajo qué clave venga. */
function findMimeLike(obj: Record<string, unknown>): string | undefined {
  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && MIME_LIKE.test(value.trim())) {
      return value.trim();
    }
  }
  return undefined;
}
