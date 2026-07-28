import { serverFetch } from "./server-fetch";

// Debe reflejar exactamente WorkOrderPartView/WorkOrderPartsSummary en
// packages/backend/src/work-orders/work-order-parts.service.ts
export interface WorkOrderPartLine {
  id: string;
  quantity: number;
  unitPrice: string;
  /** Redactado por el backend para todo rol distinto de ADMIN. */
  unitCost?: string;
  workOrderId: string;
  sparePartId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  sparePart: {
    id: string;
    sku: string;
    name: string;
  };
}

export interface WorkOrderPartsSummary {
  items: WorkOrderPartLine[];
  totalSale: string;
  /** Solo presente para ADMIN. */
  totalCost?: string;
}

/** GET /work-orders/:orderId/parts */
export function getWorkOrderParts(
  orderId: string,
): Promise<WorkOrderPartsSummary> {
  return serverFetch<WorkOrderPartsSummary>(`/work-orders/${orderId}/parts`);
}
