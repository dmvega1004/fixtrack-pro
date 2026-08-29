import { serverFetch } from "./server-fetch";
import type { SparePartCategory } from "@/lib/spare-part-category";

// Debe reflejar exactamente SparePartView en
// packages/backend/src/spare-parts/spare-parts.service.ts
export interface SparePart {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  stock: number;
  minStock: number;
  /** false = se pide contra pedido: no entra en alertas ni mueve stock. */
  trackStock: boolean;
  /** Redactado por el backend para TECHNICIAN (RBAC financiero). */
  salePrice?: string;
  /** Redactado por el backend para todo rol distinto de ADMIN. */
  cost?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSparePartInput {
  sku: string;
  name: string;
  description?: string;
  category?: SparePartCategory;
  stock: number;
  minStock?: number;
  trackStock?: boolean;
  cost: number;
  salePrice: number;
}

export type UpdateSparePartInput = Partial<CreateSparePartInput>;

interface GetSparePartsOptions {
  lowStock?: boolean;
}

/**
 * GET /spare-parts[?lowStock=true]. Catálogo completo (visible a los 3
 * roles); salePrice viene omitido para TECHNICIAN.
 */
export function getSpareParts(
  options: GetSparePartsOptions = {},
): Promise<SparePart[]> {
  const query = options.lowStock ? "?lowStock=true" : "";
  return serverFetch<SparePart[]>(`/spare-parts${query}`);
}

/** GET /spare-parts/:id. 404 si el repuesto es de otra empresa. */
export function getSparePart(id: string): Promise<SparePart> {
  return serverFetch<SparePart>(`/spare-parts/${id}`);
}

/** POST /spare-parts. Solo ADMIN (403 para el resto); 409 si el SKU ya existe. */
export function createSparePart(
  dto: CreateSparePartInput,
): Promise<SparePart> {
  return serverFetch<SparePart>("/spare-parts", { method: "POST", body: dto });
}

/** PATCH /spare-parts/:id. Solo ADMIN; 409 si el nuevo SKU ya existe. */
export function updateSparePart(
  id: string,
  dto: UpdateSparePartInput,
): Promise<SparePart> {
  return serverFetch<SparePart>(`/spare-parts/${id}`, {
    method: "PATCH",
    body: dto,
  });
}

/** DELETE /spare-parts/:id. Solo ADMIN; 409 si el repuesto tiene historial en órdenes. */
export function deleteSparePart(id: string): Promise<SparePart> {
  return serverFetch<SparePart>(`/spare-parts/${id}`, { method: "DELETE" });
}
