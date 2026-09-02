import type { WorkOrder } from "@/lib/api/work-orders";
import type { Attachment } from "@/lib/api/attachments";
import type { WorkOrderPartsSummary } from "@/lib/api/work-order-parts";

/**
 * Forma exacta de GET /api/sincronizacion — fuente única para el route
 * handler (servidor) y el motor de sincronización (cliente). Todas las
 * importaciones de este archivo deben ser `import type`: no tiene ningún
 * export en tiempo de ejecución, así que se puede importar sin riesgo
 * desde código de cliente aunque WorkOrder/Attachment/WorkOrderPartsSummary
 * vengan de módulos server-only (serverFetch) — el tipo se borra al
 * compilar, el código que lo arrastra no.
 */
export interface SyncWorkOrder extends WorkOrder {
  photos: Attachment[];
  parts: WorkOrderPartsSummary;
}

export interface SyncPayload {
  syncedAt: string;
  payloadVersion: number;
  orders: SyncWorkOrder[];
}
