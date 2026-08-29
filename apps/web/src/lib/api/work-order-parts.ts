import { serverFetch } from "./server-fetch";
import type { PaymentStatus } from "./work-orders";

// Debe reflejar exactamente WorkOrderPartView/WorkOrderPartsSummary en
// packages/backend/src/work-orders/work-order-parts.service.ts
export interface WorkOrderPartLine {
  id: string;
  quantity: number;
  /** Redactado por el backend para TECHNICIAN (RBAC financiero). */
  unitPrice?: string;
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

/**
 * Concepto de valorización (desglose del cobro, ver WorkOrderItem en el
 * backend) — texto libre + cantidad + valor unitario, igual que un ítem de
 * cotización. Visible para ADMIN/COORDINATOR, editable solo por ADMIN;
 * omitido por completo para TECHNICIAN (ver WorkOrderPartsSummary.concepts).
 */
export interface WorkOrderConceptLine {
  id: string;
  position: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

/**
 * Cierre económico de la orden. Los montos son precios al cliente (no
 * costos): visibles para ADMIN/COORDINATOR; solo ADMIN puede editarlos.
 * Omitido por completo para TECHNICIAN (ver WorkOrderPartsSummary.billing).
 */
export interface WorkOrderBilling {
  laborAmount: string;
  additionalAmount: string;
  additionalDescription: string | null;
  discountAmount: string;
  subtotal: string;
  /** Tasa efectivamente usada: la congelada si la orden ya cerró, si no la vigente de la empresa. */
  taxRate: string;
  taxAmount: string;
  /** Congelado (no se recalcula) si la orden ya pasó por COMPLETED; si no, calculado en vivo. */
  total: string;
  isFrozen: boolean;
  billedAt: string | null;
  paymentStatus: PaymentStatus;
  /** Suma de abonos registrados contra la orden. */
  paidAmount: string;
}

export interface WorkOrderPartsSummary {
  items: WorkOrderPartLine[];
  /** Omitido para TECHNICIAN (RBAC financiero) — ver WorkOrderPartLine.unitPrice. */
  totalSale?: string;
  /** Solo presente para ADMIN. */
  totalCost?: string;
  /** Omitido para TECHNICIAN (RBAC financiero) — ver WorkOrderConceptLine. */
  concepts?: WorkOrderConceptLine[];
  /** Omitido para TECHNICIAN (RBAC financiero). */
  billing?: WorkOrderBilling;
  /**
   * Costos internos (bloque "Costos internos", pestaña «Valores») — lo que
   * el trabajo costó fuera del inventario. Solo presente para ADMIN, igual
   * que totalCost: nunca se factura al cliente ni aparece en ningún
   * documento impreso.
   */
  directCostAmount?: string;
  directCostDescription?: string | null;
}

/** GET /work-orders/:orderId/parts */
export function getWorkOrderParts(
  orderId: string,
): Promise<WorkOrderPartsSummary> {
  return serverFetch<WorkOrderPartsSummary>(`/work-orders/${orderId}/parts`);
}
