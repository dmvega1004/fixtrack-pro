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
}

/**
 * GET /auth/me — a diferencia de session.ts (que solo decodifica el JWT
 * sin ir al backend), esta sí pega al backend: mustChangePassword puede
 * cambiar sin que se emita un token nuevo (ej. un ADMIN restablece la
 * contraseña de alguien mientras su sesión sigue abierta), así que el
 * valor del JWT firmado quedaría desactualizado. Server-only (usa la
 * cookie httpOnly vía serverFetch).
 */
export function getCurrentUser(): Promise<CurrentUser> {
  return serverFetch<CurrentUser>("/auth/me");
}
