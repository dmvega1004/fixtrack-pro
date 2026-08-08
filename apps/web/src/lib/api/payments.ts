import { serverFetch } from "./server-fetch";
import type { PaymentMethod } from "@/lib/payment-method";

export type { PaymentMethod } from "@/lib/payment-method";

// Debe reflejar exactamente PaymentView en packages/backend/src/payments/payments.service.ts
export interface Payment {
  id: string;
  workOrderId: string;
  amount: string;
  paidAt: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  registeredBy: { id: string; name: string } | null;
  createdAt: string;
}

/** GET /work-orders/:orderId/payments. Solo ADMIN (403 para el resto). */
export function getWorkOrderPayments(orderId: string): Promise<Payment[]> {
  return serverFetch<Payment[]>(`/work-orders/${orderId}/payments`);
}
