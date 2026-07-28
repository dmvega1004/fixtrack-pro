import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { HttpError } from "./http";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

interface BackendErrorBody {
  message?: string | string[];
}

/**
 * Fetch autenticado hacia el backend NestJS. Server-only: lee la cookie
 * httpOnly `fixtrack_session` y la reenvía como `Authorization: Bearer`.
 * El token nunca llega al cliente.
 *
 * Si el backend responde 401 (token vencido o inválido), limpia la cookie
 * y redirige a /login vía la route handler de logout — redirigir directo a
 * /login dejaría la cookie viva, y como el proxy solo verifica que exista
 * (no que sea válida), volvería a mandar al usuario a "/" en bucle.
 */
export async function serverFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (response.status === 401) {
    redirect("/api/auth/logout");
  }

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
