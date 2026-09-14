import type { ReportFormatSource } from "@/lib/report-format";

/**
 * Una sección de contenido configurable de la orden de trabajo — mismo
 * mecanismo que Client.reportFormatS1/S2/S3 (rótulo + origen), pero lista
 * variable y reordenable en vez de 3 campos fijos. Debe reflejar
 * exactamente WorkOrderSectionDto en
 * packages/backend/src/company/dto/update-company.dto.ts.
 */
export interface WorkOrderSection {
  label: string;
  source: ReportFormatSource;
}

/** Debe reflejar exactamente MAX_WORK_ORDER_SECTIONS en el backend. */
export const MAX_WORK_ORDER_SECTIONS = 10;
