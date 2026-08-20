import { serverFetch } from "./server-fetch";
import type { PaymentStatus } from "./work-orders";

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

/**
 * Cierre económico de la orden. Los montos son precios al cliente (no
 * costos): visibles para los 3 roles; solo ADMIN puede editarlos.
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
  totalSale: string;
  /** Solo presente para ADMIN. */
  totalCost?: string;
  billing: WorkOrderBilling;
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
