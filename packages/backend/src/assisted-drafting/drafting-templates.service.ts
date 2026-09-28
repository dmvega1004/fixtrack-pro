import { createHash } from 'crypto';
import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

const TEMPLATES_RELATIVE_PATH = join('docs', 'plantillas-redaccion.md');

/** Cuántos niveles se sube buscando la carpeta docs/ del monorepo. */
const MAX_PARENT_LEVELS = 6;

/**
 * Por debajo de esto el archivo no puede contener las plantillas ni las
 * prohibiciones — tratarlo como ausente (un archivo vaciado por error es
 * tan peligroso como uno que no existe).
 */
const MIN_TEMPLATES_LENGTH = 500;

export interface LoadedTemplates {
  content: string;
  /** sha256 abreviado — se guarda en AssistedDraftUsage.templatesHash. */
  hash: string;
  path: string;
}

/**
 * Carga docs/plantillas-redaccion.md, la fuente de verdad del estilo de
 * redacción. El código NO contiene el texto de las plantillas: lo lee de
 * ese archivo, así que editarlo cambia cómo se redacta sin tocar código.
 *
 * FALLA CERRADA, mismo criterio que PROVISIONING_KEY: si el archivo no
 * aparece (o está vacío), la redacción asistida queda DESHABILITADA y se
 * deja un error visible en los logs de arranque. Jamás se genera sin
 * plantillas — sería texto genérico sin las reglas de no inventar, firmado
 * por un técnico y entregado a un cliente.
 *
 * Ubicación: ASSIST_TEMPLATES_PATH si está definida (y entonces SOLO esa),
 * si no se busca docs/plantillas-redaccion.md subiendo desde el directorio
 * de este archivo y desde el cwd. En Railway (Railpack) la imagen contiene
 * el repo completo en /app, y el proceso corre en /app/packages/backend.
 *
 * Se relee cuando cambia la fecha de modificación: una edición en local se
 * nota en la siguiente generación, sin reiniciar.
 */
@Injectable()
export class DraftingTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(DraftingTemplatesService.name);
  private cached: (LoadedTemplates & { mtimeMs: number }) | null = null;

  onModuleInit(): void {
    const loaded = this.load();
    if (loaded) {
      this.logger.log(
        `Plantillas de redacción cargadas desde ${loaded.path} (hash ${loaded.hash})`,
      );
    } else {
      this.logger.error(
        'REDACCIÓN ASISTIDA DESHABILITADA: no se encontró docs/plantillas-redaccion.md ' +
          `(o tiene menos de ${MIN_TEMPLATES_LENGTH} caracteres). Buscado en: ` +
          this.candidatePaths().join(', ') +
          '. Sin plantillas no se genera ningún texto.',
      );
    }
  }

  /** Plantillas vigentes, o null si no hay (la función queda deshabilitada). */
  load(): LoadedTemplates | null {
    const path = this.candidatePaths().find((candidate) =>
      existsSync(candidate),
    );
    if (!path) {
      this.cached = null;
      return null;
    }

    try {
      const { mtimeMs } = statSync(path);
      if (this.cached?.path === path && this.cached.mtimeMs === mtimeMs) {
        return this.cached;
      }

      const content = readFileSync(path, 'utf8');
      if (content.trim().length < MIN_TEMPLATES_LENGTH) {
        this.cached = null;
        return null;
      }

      const hash = createHash('sha256')
        .update(content)
        .digest('hex')
        .slice(0, 16);
      this.cached = { content, hash, path, mtimeMs };
      return this.cached;
    } catch (error) {
      this.logger.error(
        `No se pudo leer ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.cached = null;
      return null;
    }
  }

  private candidatePaths(): string[] {
    const explicit = process.env.ASSIST_TEMPLATES_PATH?.trim();
    if (explicit) return [resolve(explicit)];

    const candidates = new Set<string>();
    for (const start of [__dirname, process.cwd()]) {
      let dir = start;
      for (let level = 0; level <= MAX_PARENT_LEVELS; level++) {
        candidates.add(join(dir, TEMPLATES_RELATIVE_PATH));
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    }
    return [...candidates];
  }
}
