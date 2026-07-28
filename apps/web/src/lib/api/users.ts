import type { Role } from "./auth";
import { serverFetch } from "./server-fetch";

export interface Technician {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /users?role=TECHNICIAN. Solo ADMIN/COORDINATOR pueden llamarlo (403 para Técnico). */
export function getTechnicians(): Promise<Technician[]> {
  return serverFetch<Technician[]>("/users?role=TECHNICIAN");
}
