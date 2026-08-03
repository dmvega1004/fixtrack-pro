import type { Role } from "./api/auth";

// Debe reflejar exactamente el enum Role de packages/database/prisma/schema.prisma
export const ROLES: readonly Role[] = ["ADMIN", "COORDINATOR", "TECHNICIAN"];

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
