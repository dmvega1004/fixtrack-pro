const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

interface BackendErrorBody {
  message?: string | string[];
}

/** Fetch base hacia el backend NestJS. Server-only: usa BACKEND_URL (sin prefijo NEXT_PUBLIC). */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

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
