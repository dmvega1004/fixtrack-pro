import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  v2 as cloudinary,
  type UploadApiErrorResponse,
  type UploadApiResponse,
} from 'cloudinary';

export interface UploadImageOptions {
  /** Carpeta destino, ej. fixtrack/{companyId}/orders/{orderId} */
  folder: string;
  /** Lado máximo (px) para la transformación `limit` — no recorta, solo evita archivos gigantes. */
  maxDimension?: number;
}

const REQUIRED_ENV_VARS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

/** Prefijos/fragmentos típicos de un valor de marcador que nunca es una credencial real. */
const PLACEHOLDER_PATTERNS = [/^tu_/i, /^your_/i, /xxx/i];

function looksLikePlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Envoltorio delgado sobre el SDK de Cloudinary. La configuración se valida
 * de forma PEREZOSA (al primer upload/destroy), nunca en el constructor:
 * si faltan credenciales, el error aparece cuando alguien intenta subir un
 * archivo, no al arrancar el servidor (que no debe depender de Cloudinary
 * para levantar).
 *
 * Como el fallo real solo se ve en campo (un técnico subiendo una foto),
 * `onModuleInit` además registra una advertencia en los logs de arranque si
 * detecta variables faltantes o con valores de marcador — así se detecta en
 * el despliegue, sin bloquearlo.
 */
@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

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
        `Cloudinary mal configurado — la subida de fotos fallará hasta corregirlo en Railway: ${problems.join(', ')}`,
      );
    }
  }

  uploadBuffer(
    buffer: Buffer,
    options: UploadImageOptions,
  ): Promise<UploadApiResponse> {
    this.ensureConfigured();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: 'image',
          transformation: options.maxDimension
            ? [
                {
                  width: options.maxDimension,
                  height: options.maxDimension,
                  crop: 'limit',
                },
              ]
            : undefined,
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(
              error instanceof Error
                ? error
                : new Error(
                    error?.message ?? 'Cloudinary no devolvió resultado',
                  ),
            );
            return;
          }
          resolve(result);
        },
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Borrado en Cloudinary: SIEMPRE best-effort. Si Cloudinary falla acá, no
   * queremos tumbar la operación local (el peor caso es un archivo remoto
   * huérfano, no un registro roto en nuestra base de datos).
   */
  async destroy(publicId: string): Promise<void> {
    this.ensureConfigured();
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch {
      // Best-effort: se ignora — ver comentario arriba.
    }
  }

  /**
   * Extrae el public_id de una URL de Cloudinary generada por ESTA cuenta.
   * Devuelve null si la URL no es de Cloudinary (ej. una ruta local legacy
   * como "/tenant/logo.png") — el llamador debe tratarlo como "no borrable".
   */
  extractPublicId(url: string): string | null {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName || !url.includes(`res.cloudinary.com/${cloudName}/`)) {
      return null;
    }

    // .../upload/[transformaciones/]v<version>/<public_id>.<ext>
    const match = url.match(/\/upload\/(?:[^/]+\/)*?v\d+\/(.+)\.[a-zA-Z0-9]+$/);
    return match ? match[1] : null;
  }

  private ensureConfigured(): void {
    if (this.configured) return;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Cloudinary no está configurado en el servidor: faltan las variables ' +
          'de entorno CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    this.configured = true;
  }
}
