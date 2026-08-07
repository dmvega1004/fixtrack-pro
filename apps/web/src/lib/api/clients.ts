import { serverFetch } from "./server-fetch";
import type { DocumentType } from "@/lib/document-type";

export type { DocumentType } from "@/lib/document-type";

// Debe reflejar exactamente el modelo Client de packages/database/prisma/schema.prisma
export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentType: string | null;
  documentNumber: string | null;
  address: string | null;
  /** Días de crédito acordados con el cliente (ej. 30 = "pago a 30 días"). */
  paymentTermDays: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
  name: string;
  email?: string;
  phone?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  address?: string;
  paymentTermDays?: number;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  address?: string;
  paymentTermDays?: number;
}

/** GET /clients. Cualquier rol autenticado ve los clientes de su empresa. */
export function getClients(): Promise<Client[]> {
  return serverFetch<Client[]>("/clients");
}

/** GET /clients/:id. 404 si el cliente es de otra empresa. */
export function getClient(id: string): Promise<Client> {
  return serverFetch<Client>(`/clients/${id}`);
}

/** POST /clients. Cualquier rol autenticado puede crear (los técnicos crean en campo). */
export function createClient(dto: CreateClientInput): Promise<Client> {
  return serverFetch<Client>("/clients", { method: "POST", body: dto });
}

/** PATCH /clients/:id. Cualquier rol autenticado puede editar. */
export function updateClient(id: string, dto: UpdateClientInput): Promise<Client> {
  return serverFetch<Client>(`/clients/${id}`, { method: "PATCH", body: dto });
}

/**
 * DELETE /clients/:id. Solo ADMIN (RBAC del backend). 409 si el cliente
 * tiene equipos registrados (FK con onDelete: Restrict en Equipment.clientId).
 */
export function deleteClient(id: string): Promise<Client> {
  return serverFetch<Client>(`/clients/${id}`, { method: "DELETE" });
}
