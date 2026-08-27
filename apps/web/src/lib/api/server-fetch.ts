import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { fetchWithResilience, HttpError } from "./http";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /**
   * Por defecto, un 401 del backend se interpreta como "sesión inválida"
   * (token vencido/corrupto) y redirige a logout. Actívalo en llamadas
   * donde un 401 tiene un significado de negocio propio que NO debe
   * cerrar la sesión — ej. PATCH /auth/password responde 401 cuando
   * currentPassword no coincide, y ese caso debe mostrarse en el campo
   * del formulario, no desloguear a alguien que sigue autenticado.
   */
  allowUnauthorized?: boolean;
}

/**
 * Fetch autenticado hacia el backend NestJS. Server-only: lee la cookie
 * httpOnly `fixtrack_session` y la reenvía como `Authorization: Bearer`.
 * El token nunca llega al cliente.
 *
 * Tiempo límite y reintento (solo lecturas, solo red/tiempo agotado) los
 * resuelve fetchWithResilience — ver lib/api/http.ts.
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

  try {
    return await fetchWithResilience<T>(`${BACKEND_URL}${path}`, {
      method: options.method,
      body: options.body,
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    if (!options.allowUnauthorized && error instanceof HttpError && error.status === 401) {
      redirect("/api/auth/logout");
    }
    throw error;
  }
}
