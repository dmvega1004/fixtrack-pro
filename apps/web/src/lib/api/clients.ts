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
