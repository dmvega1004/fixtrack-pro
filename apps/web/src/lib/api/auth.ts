import { apiFetch } from "./http";

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
