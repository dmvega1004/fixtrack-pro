/**
 * Contrato con el proveedor del modelo. Todo lo específico de un proveedor
 * (SDK, formato de la respuesta, nombres de los tokens) vive detrás de
 * esta interfaz — cambiar de proveedor es escribir otra implementación y
 * apuntar ASSIST_PROVIDER a ella, sin tocar cuota, contexto ni medición.
 */

export interface DraftingRequest {
  /** Instrucciones construidas a partir de docs/plantillas-redaccion.md. */
  system: string;
  /** Apuntes del técnico + contexto de la orden. */
  user: string;
  /** JSON schema que debe cumplir la respuesta. */
  outputSchema: Record<string, unknown>;
}

export interface DraftingUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface DraftingResponse {
  /** JSON crudo devuelto por el modelo (se valida afuera). */
  json: unknown;
  usage: DraftingUsage;
  model: string;
}

/**
 * Falla del proveedor. `usage` viaja cuando la llamada alcanzó a consumir
 * tokens (ej. respuesta truncada): el costo se registra igual.
 */
export class DraftingProviderError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly usage?: DraftingUsage,
  ) {
    super(message);
  }
}

export interface DraftingProvider {
  readonly name: string;
  readonly model: string;
  /** Motivo por el que no se puede usar (ej. falta la llave), o null. */
  configurationProblem(): string | null;
  generate(request: DraftingRequest): Promise<DraftingResponse>;
}

export const DRAFTING_PROVIDER = Symbol('DRAFTING_PROVIDER');
