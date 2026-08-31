import { serverFetch } from "./server-fetch";

export type RetentionBase = "SUBTOTAL" | "IVA" | "RETENTION";

export const RETENTION_BASES: RetentionBase[] = ["SUBTOTAL", "IVA", "RETENTION"];

export const RETENTION_BASE_LABELS: Record<RetentionBase, string> = {
  SUBTOTAL: "Subtotal del servicio (antes de IVA)",
  IVA: "IVA",
  RETENTION: "Otra retención del catálogo",
};

// Debe reflejar exactamente el modelo Retention de packages/database/prisma/schema.prisma
export interface Retention {
  id: string;
  companyId: string;
  name: string;
  /** Porcentaje con hasta 3 decimales (ej. "0.900" para 0,9 %). */
  rate: string;
  base: RetentionBase;
  /** Solo presente cuando base = "RETENTION". */
  baseRetentionId: string | null;
  position: number;
  /** Desactivarla no afecta las órdenes que ya la tienen aplicada — solo deja de ofrecerse en las nuevas. */
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRetentionInput {
  name: string;
  rate: number;
  base: RetentionBase;
  baseRetentionId?: string;
}

export interface UpdateRetentionInput {
  name?: string;
  rate?: number;
  base?: RetentionBase;
  baseRetentionId?: string;
  active?: boolean;
}

/** GET /retentions. Solo ADMIN — catálogo completo (activas e inactivas), en orden. */
export function getRetentions(): Promise<Retention[]> {
  return serverFetch<Retention[]>("/retentions");
}

/** POST /retentions. Solo ADMIN. */
export function createRetention(dto: CreateRetentionInput): Promise<Retention> {
  return serverFetch<Retention>("/retentions", { method: "POST", body: dto });
}

/** PATCH /retentions/:id. Solo ADMIN. */
export function updateRetention(
  id: string,
  dto: UpdateRetentionInput,
): Promise<Retention> {
  return serverFetch<Retention>(`/retentions/${id}`, {
    method: "PATCH",
    body: dto,
  });
}

/** PATCH /retentions/reorder. Solo ADMIN — reemplazo completo del orden. */
export function reorderRetentions(ids: string[]): Promise<Retention[]> {
  return serverFetch<Retention[]>("/retentions/reorder", {
    method: "PATCH",
    body: { ids },
  });
}
