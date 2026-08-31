// Debe reflejar exactamente RETENTION_BASES en
// packages/backend/src/retentions/dto/create-retention.dto.ts
//
// Vive en su propio módulo (sin dependencias de servidor) para que
// componentes "use client" (RetentionsCard, ClientForm, RetentionsSection)
// puedan importar el array/tipo sin arrastrar lib/api/retentions.ts ->
// server-fetch.ts -> next/headers al bundle del navegador (eso rompe el
// build: "next/headers" solo es válido en Server Components) — mismo
// criterio que lib/report-format.ts.
export const RETENTION_BASES = ["SUBTOTAL", "IVA", "RETENTION"] as const;
export type RetentionBase = (typeof RETENTION_BASES)[number];

export const RETENTION_BASE_LABELS: Record<RetentionBase, string> = {
  SUBTOTAL: "Subtotal del servicio (antes de IVA)",
  IVA: "IVA",
  RETENTION: "Otra retención del catálogo",
};
