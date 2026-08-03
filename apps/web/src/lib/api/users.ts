import type { Role } from "./auth";
import { serverFetch } from "./server-fetch";

// Debe reflejar exactamente PUBLIC_USER_SELECT en
// packages/backend/src/users/users.service.ts (el hash nunca sale del backend)
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

/** Alias histórico: se usa donde solo interesan los técnicos (asignación de órdenes). */
export type Technician = Employee;

export interface CreateEmployeeInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateEmployeeInput {
  name?: string;
  role?: Role;
  password?: string;
}

/** GET /users?role=TECHNICIAN. Solo ADMIN/COORDINATOR pueden llamarlo (403 para Técnico). */
export function getTechnicians(): Promise<Technician[]> {
  return serverFetch<Technician[]>("/users?role=TECHNICIAN");
}

/** GET /users[?role=]. ADMIN y COORDINATOR ven la nómina de su empresa. */
export function getUsers(role?: Role): Promise<Employee[]> {
  const query = role ? `?role=${role}` : "";
  return serverFetch<Employee[]>(`/users${query}`);
}

/** GET /users/:id. ADMIN y COORDINATOR. */
export function getUser(id: string): Promise<Employee> {
  return serverFetch<Employee>(`/users/${id}`);
}

/** POST /users. Solo ADMIN: invita empleados de su propia empresa. */
export function createUser(dto: CreateEmployeeInput): Promise<Employee> {
  return serverFetch<Employee>("/users", { method: "POST", body: dto });
}

/** PATCH /users/:id. Solo ADMIN: nombre, rol o reset de contraseña. */
export function updateUser(id: string, dto: UpdateEmployeeInput): Promise<Employee> {
  return serverFetch<Employee>(`/users/${id}`, { method: "PATCH", body: dto });
}

/** DELETE /users/:id. Solo ADMIN, con protecciones anti-lockout en el backend. */
export function deleteUser(id: string): Promise<Employee> {
  return serverFetch<Employee>(`/users/${id}`, { method: "DELETE" });
}
