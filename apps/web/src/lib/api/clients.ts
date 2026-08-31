import { serverFetch } from "./server-fetch";
import type { DocumentType } from "@/lib/document-type";
import type { ReportFormatSource } from "@/lib/report-format";

export type { DocumentType } from "@/lib/document-type";
// REPORT_FORMAT_SOURCES/ReportFormatSource viven en lib/report-format.ts
// (sin dependencias de servidor) — ver ese archivo para el porqué.
export { REPORT_FORMAT_SOURCES } from "@/lib/report-format";
export type { ReportFormatSource } from "@/lib/report-format";

// Debe reflejar exactamente el modelo Client de packages/database/prisma/schema.prisma
export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentType: string | null;
  documentNumber: string | null;
  address: string | null;
  city: string | null;
  /** Días de crédito acordados con el cliente (ej. 30 = "pago a 30 días"). */
  paymentTermDays: number;

  /** Formato de informe propio del cliente (Módulo de Formatos) — ver /ordenes/[id]/formato-cliente. */
  reportFormatEnabled: boolean;
  reportFormatTitle: string | null;
  reportFormatCode: string | null;
  reportFormatVersion: string | null;
  reportFormatDate: string | null;
  reportFormatLogoUrl: string | null;
  reportFormatAccentColor: string | null;
  reportFormatFooter: string | null;
  reportFormatIssuer: string | null;
  reportFormatS1Label: string | null;
  reportFormatS1Source: ReportFormatSource | null;
  reportFormatS2Label: string | null;
  reportFormatS2Source: ReportFormatSource | null;
  reportFormatS3Label: string | null;
  reportFormatS3Source: ReportFormatSource | null;
  reportFormatIncludePhotos: boolean;
  reportFormatPhotosLabel: string | null;

  companyId: string;
  createdAt: string;
  updatedAt: string;
  /** Solo presentes en la respuesta de getClients() (findAll), agregados en SQL. */
  equipmentCount?: number;
  orderCount?: number;
  /**
   * Retenciones que este cliente aplica por defecto (ids del catálogo,
   * ver /lib/api/retentions) — premarcan las casillas en sus órdenes
   * nuevas. Visible para cualquier rol que pueda ver la ficha; solo ADMIN
   * puede editarlo.
   */
  retentionIds: string[];
}

export interface ReportFormatInput {
  reportFormatEnabled?: boolean;
  reportFormatTitle?: string;
  reportFormatCode?: string;
  reportFormatVersion?: string;
  reportFormatDate?: string;
  reportFormatAccentColor?: string;
  reportFormatFooter?: string;
  reportFormatIssuer?: string;
  reportFormatS1Label?: string;
  reportFormatS1Source?: ReportFormatSource;
  reportFormatS2Label?: string;
  reportFormatS2Source?: ReportFormatSource;
  reportFormatS3Label?: string;
  reportFormatS3Source?: ReportFormatSource;
  reportFormatIncludePhotos?: boolean;
  reportFormatPhotosLabel?: string;
}

export interface CreateClientInput extends ReportFormatInput {
  name: string;
  email?: string;
  phone?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  address?: string;
  city?: string;
  paymentTermDays?: number;
  /** Solo ADMIN (403 del backend para el resto) — reemplazo completo. */
  retentionIds?: string[];
}

export interface UpdateClientInput extends ReportFormatInput {
  name?: string;
  email?: string;
  phone?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  address?: string;
  city?: string;
  paymentTermDays?: number;
  /** Solo ADMIN (403 del backend para el resto) — reemplazo completo. */
  retentionIds?: string[];
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
