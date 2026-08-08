import { serverFetch } from "./server-fetch";
import type { PaymentStatus } from "./work-orders";
import type { PaymentMethod } from "./payments";

// Debe reflejar exactamente BillingSummary en packages/backend/src/billing/billing.service.ts
export interface BillingSummary {
  billedThisMonth: string;
  collectedThisMonth: string;
  totalReceivable: string;
  totalOverdue: string;
  recentPayments: RecentPayment[];
}

export interface RecentPayment {
  id: string;
  amount: string;
  paidAt: string;
  method: PaymentMethod;
  orderId: string;
  orderNumber: number;
  clientName: string;
}

// Debe reflejar exactamente ReceivableView en packages/backend/src/billing/billing.service.ts
export interface Receivable {
  orderId: string;
  orderNumber: number;
  clientId: string;
  clientName: string;
  description: string;
  total: string;
  paid: string;
  balance: string;
  billedAt: string;
  daysSinceBilled: number;
  paymentTermDays: number;
  isOverdue: boolean;
  paymentStatus: PaymentStatus;
}

export interface ClientBalance {
  clientId: string;
  clientName: string;
  balance: string;
}

/** GET /billing/summary. Solo ADMIN (403 para el resto). */
export function getBillingSummary(): Promise<BillingSummary> {
  return serverFetch<BillingSummary>("/billing/summary");
}

/** GET /billing/receivables. Solo ADMIN. Órdenes cerradas con saldo pendiente, más antigua primero. */
export function getReceivables(): Promise<Receivable[]> {
  return serverFetch<Receivable[]>("/billing/receivables");
}

/** GET /billing/by-client. Solo ADMIN. Saldo agregado por cliente, de mayor a menor. */
export function getClientBalances(): Promise<ClientBalance[]> {
  return serverFetch<ClientBalance[]>("/billing/by-client");
}
