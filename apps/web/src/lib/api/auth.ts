import { cache } from "react";
import { apiFetch } from "./http";
import { serverFetch } from "./server-fetch";

// Debe reflejar exactamente el enum Role de packages/database/prisma/schema.prisma
export type Role = "ADMIN" | "COORDINATOR" | "TECHNICIAN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

/** Llama a POST /auth/login del backend NestJS. Devuelve el JWT y el usuario. */
export function login(email: string, password: string): Promise<LoginResult> {
  return apiFetch<LoginResult>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

/** Debe reflejar exactamente AuthenticatedUser del backend (jwt-payload.interface.ts). */
export interface CurrentUser {
  userId: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
  /**
   * true = la contraseña actual la asignó un tercero (alta de empresa o
   * restablecimiento por un ADMIN) y debe cambiarla antes de continuar.
   */
  mustChangePassword: boolean;
  /** Datos con los que firma una orden (bloque "Firmas" del detalle). */
  documentNumber: string | null;
  signatureImageUrl: string | null;
}

/**
 * GET /auth/me — a diferencia de session.ts (que solo decodifica el JWT
 * sin ir al backend), esta sí pega al backend: mustChangePassword puede
 * cambiar sin que se emita un token nuevo (ej. un ADMIN restablece la
 * contraseña de alguien mientras su sesión sigue abierta), así que el
 * valor del JWT firmado quedaría desactualizado. Server-only (usa la
 * cookie httpOnly vía serverFetch).
 *
 * Envuelta en cache() de React: el layout del dashboard y la página la
 * comparten en la MISMA petición — una sola llamada al backend aunque ambos
 * la pidan. El detalle de la orden la usa para los datos de firma en vez de
 * pagar una llamada aparte a GET /users/me. cache() vive solo durante el
 * render de una petición: no hay estado compartido entre usuarios ni entre
 * navegaciones.
 */
export const getCurrentUser = cache(
  (): Promise<CurrentUser> => serverFetch<CurrentUser>("/auth/me"),
);
