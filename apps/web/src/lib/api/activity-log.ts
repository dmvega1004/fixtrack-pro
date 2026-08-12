import { serverFetch } from "./server-fetch";

/** Debe reflejar exactamente el enum ActivityAction de packages/database/prisma/schema.prisma */
export type ActivityAction =
  | "ORDER_CREATED"
  | "STATUS_CHANGED"
  | "TECHNICIAN_ASSIGNED"
  | "PRIORITY_CHANGED"
  | "DIAGNOSIS_UPDATED"
  | "OBSERVATIONS_UPDATED"
  | "DESCRIPTION_UPDATED"
  | "EQUIPMENT_LINKED"
  | "EQUIPMENT_UNLINKED"
  | "PART_ADDED"
  | "PART_REMOVED"
  | "PHOTO_ADDED"
  | "PHOTO_REMOVED"
  | "BILLING_UPDATED"
  | "BILLED_AT_CHANGED"
  | "COLLECTION_DOC_GENERATED"
  | "PAYMENT_REGISTERED"
  | "PAYMENT_DELETED";

// Debe reflejar exactamente el modelo ActivityLog de
// packages/database/prisma/schema.prisma
export interface ActivityLogEntry {
  id: string;
  workOrderId: string;
  userId: string | null;
  userName: string;
  action: ActivityAction;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  isFinancial: boolean;
  createdAt: string;
}

/**
 * GET /work-orders/:orderId/activity. Mismas reglas de visibilidad que la
 * orden; el backend ya filtra los eventos financieros para TECHNICIAN, no
 * hay nada que replicar acá.
 */
export function getActivityLog(orderId: string): Promise<ActivityLogEntry[]> {
  return serverFetch<ActivityLogEntry[]>(`/work-orders/${orderId}/activity`);
}
