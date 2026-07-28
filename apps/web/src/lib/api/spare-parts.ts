import { serverFetch } from "./server-fetch";

// Debe reflejar exactamente SparePartView en
// packages/backend/src/spare-parts/spare-parts.service.ts
export interface SparePart {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  stock: number;
  minStock: number;
  salePrice: string;
  /** Redactado por el backend para todo rol distinto de ADMIN. */
  cost?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /spare-parts. Catálogo completo (visible a los 3 roles). */
export function getSpareParts(): Promise<SparePart[]> {
  return serverFetch<SparePart[]>("/spare-parts");
}
