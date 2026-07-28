import type { Role } from "./api/auth";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  COORDINATOR: "Coordinador",
  TECHNICIAN: "Técnico",
};

export interface Session {
  userId: string;
  email: string;
  role: Role;
  companyId: string;
}
