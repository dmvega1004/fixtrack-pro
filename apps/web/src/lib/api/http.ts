const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

/** Lecturas: 12s. Una consulta que no respondió en ese tiempo probablemente no lo hará. */
const READ_TIMEOUT_MS = 12_000;
/** Escrituras: 30s. Una subida de foto con señal débil legítimamente tarda más que una consulta. */
const WRITE_TIMEOUT_MS = 30_000;
/** Espera corta antes del único reintento de una lectura fallida por red/tiempo agotado. */
const RETRY_DELAY_MS = 400;

export class HttpError extends Error {
  /**
   * Sobrevive a la redacción de mensajes que Next.js aplica a los errores
   * de Server Components/Actions en producción — a diferencia de `message`,
   * `digest` SÍ llega intacto al cliente, así que es lo único fiable para
   * que error.tsx distinga esta situación de una de red o de tiempo agotado.
   */
  public readonly digest: string;

  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
    this.digest = `FIXTRACK_HTTP_${status}`;
  }
}

/** El backend no respondió (sin señal, DNS, conexión rechazada) — no es un error de tiempo agotado. */
export class NetworkError extends Error {
  public readonly digest = "FIXTRACK_NETWORK";

  constructor(message = "No hay conexión con el servidor") {
    super(message);
    this.name = "NetworkError";
  }
}

/** Hay conexión, pero el backend no respondió dentro del tiempo límite. */
export class TimeoutError extends Error {
  public readonly digest = "FIXTRACK_TIMEOUT";

  constructor(message = "El servidor tardó demasiado en responder") {
    super(message);
    this.name = "TimeoutError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

interface BackendErrorBody {
  message?: string | string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOnce(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    if (controller.signal.aborted) {
      throw new TimeoutError();
    }
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = (data ?? {}) as BackendErrorBody;
    const rawMessage = errorBody.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join("; ")
      : (rawMessage ?? "Error inesperado del servidor");

    throw new HttpError(response.status, message);
  }

  return data as T;
}

/**
 * Fetch base hacia el backend NestJS con tiempo límite y un reintento
 * automático. Server-only: usa BACKEND_URL (sin prefijo NEXT_PUBLIC).
 *
 * El reintento SOLO aplica a lecturas (GET) que fallaron por red o por
 * tiempo agotado. Nunca se reintenta una escritura (POST/PATCH/DELETE): un
 * reintento automático podría crear una orden dos veces o duplicar un pago.
 * Tampoco se reintenta un 4xx/5xx ya respondido por el servidor — repetirlo
 * da el mismo resultado.
 */
export async function fetchWithResilience<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const isRead = method === "GET";
  const timeoutMs = isRead ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS;

  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  };

  try {
    const response = await fetchOnce(url, init, timeoutMs);
    return await parseResponse<T>(response);
  } catch (error) {
    if (isRead && (error instanceof NetworkError || error instanceof TimeoutError)) {
      await sleep(RETRY_DELAY_MS);
      const response = await fetchOnce(url, init, timeoutMs);
      return await parseResponse<T>(response);
    }
    throw error;
  }
}

export function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return fetchWithResilience<T>(`${BACKEND_URL}${path}`, options);
}

/**
 * Traduce un error de fetchWithResilience a un mensaje apto para mostrar
 * directo al usuario (ej. en un toast), sin exponer detalles técnicos.
 * Devuelve null si el error no es uno de los nuestros — el llamador debe
 * relanzarlo para que lo capture el error boundary más cercano.
 */
export function toFriendlyActionMessage(error: unknown): string | null {
  if (error instanceof HttpError) {
    return error.message;
  }
  if (error instanceof NetworkError) {
    return "No hay conexión a internet. Verifica tu señal e intenta de nuevo.";
  }
  if (error instanceof TimeoutError) {
    return "El servidor está tardando demasiado en responder. Intenta de nuevo.";
  }
  return null;
}
