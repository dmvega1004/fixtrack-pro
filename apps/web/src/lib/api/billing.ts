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
  /** Número de la cuenta de cobro emitida sobre esta orden, si existe. */
  collectionNumber: number | null;
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

// Debe reflejar exactamente BilledOrderView/BilledOrdersResult en
// packages/backend/src/billing/billing.service.ts
export interface BilledOrder {
  orderId: string;
  orderNumber: number;
  collectionNumber: number | null;
  clientId: string;
  clientName: string;
  billedAt: string;
  total: string;
  paymentStatus: PaymentStatus;
}

export interface BilledOrdersResult {
  items: BilledOrder[];
  total: string;
}

// Debe reflejar exactamente CollectedPaymentView/CollectedPaymentsResult en
// packages/backend/src/billing/billing.service.ts
export interface CollectedPayment {
  paymentId: string;
  paidAt: string;
  clientId: string;
  clientName: string;
  orderId: string;
  orderNumber: number;
  collectionNumber: number | null;
  method: PaymentMethod;
  reference: string | null;
  amount: string;
}

export interface CollectedPaymentsResult {
  items: CollectedPayment[];
  total: string;
}

export interface ReceivablesListResult {
  items: Receivable[];
  total: string;
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

/** GET /billing/billed-orders. Solo ADMIN. Detalle + total de "Facturado del mes". */
export function getBilledOrders(): Promise<BilledOrdersResult> {
  return serverFetch<BilledOrdersResult>("/billing/billed-orders");
}

/** GET /billing/collected-payments. Solo ADMIN. Detalle + total de "Cobrado del mes". */
export function getCollectedPayments(): Promise<CollectedPaymentsResult> {
  return serverFetch<CollectedPaymentsResult>("/billing/collected-payments");
}

/** GET /billing/receivables-detail. Solo ADMIN. Detalle + total de "Por cobrar". */
export function getReceivablesDetail(): Promise<ReceivablesListResult> {
  return serverFetch<ReceivablesListResult>("/billing/receivables-detail");
}

/** GET /billing/receivables-overdue. Solo ADMIN. Detalle + total de "Vencido". */
export function getOverdueReceivables(): Promise<ReceivablesListResult> {
  return serverFetch<ReceivablesListResult>("/billing/receivables-overdue");
}
