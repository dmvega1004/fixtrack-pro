import { serverFetch } from "./server-fetch";

export interface ProfitabilityRange {
  /** "YYYY-MM-DD", inclusive. */
  from: string;
  /** "YYYY-MM-DD", inclusive. */
  to: string;
}

/**
 * netReceived es una lectura DISTINTA de income/margin — cuánto entró a
 * la cuenta, no cuánto se ganó. El margen sigue calculándose sobre
 * income (derivado del valor FACTURADO, sin IVA), nunca sobre netReceived:
 * una retención no es un costo, es un anticipo del impuesto de renta que
 * se recupera al declarar.
 */
// Debe reflejar exactamente ProfitabilitySummary en
// packages/backend/src/profitability/profitability.service.ts
export interface ProfitabilitySummary {
  income: string;
  cost: string;
  margin: string;
  /** Porcentaje 0-100; null si income es 0 (nunca dividir por cero). */
  marginPercent: number | null;
  netReceived: string;
}

// Debe reflejar exactamente ProfitabilityOrderView
export interface ProfitabilityOrder {
  orderId: string;
  orderNumber: number;
  clientId: string;
  clientName: string;
  billedAt: string;
  income: string;
  cost: string;
  margin: string;
  marginPercent: number | null;
  netReceived: string;
}

// Debe reflejar exactamente ProfitabilityClientView
export interface ProfitabilityClient {
  clientId: string;
  clientName: string;
  income: string;
  cost: string;
  margin: string;
  marginPercent: number | null;
  netReceived: string;
}

// Debe reflejar exactamente ProfitabilityMonthPoint
export interface ProfitabilityMonthPoint {
  /** "YYYY-MM" */
  month: string;
  income: string;
  cost: string;
  margin: string;
  marginPercent: number | null;
  netReceived: string;
}

export type ProfitabilityOrderSortBy = "margin" | "marginPercent";
export type ProfitabilitySortOrder = "asc" | "desc";

function rangeQuery(range: ProfitabilityRange): string {
  return `from=${range.from}&to=${range.to}`;
}

/** GET /profitability/summary?from=&to=. Solo ADMIN (403 para el resto, ver ProfitabilityController). */
export function getProfitabilitySummary(
  range: ProfitabilityRange,
): Promise<ProfitabilitySummary> {
  return serverFetch<ProfitabilitySummary>(
    `/profitability/summary?${rangeQuery(range)}`,
  );
}

/** GET /profitability/orders?from=&to=&sortBy=&order=. Solo ADMIN. */
export function getProfitabilityOrders(
  range: ProfitabilityRange,
  sortBy?: ProfitabilityOrderSortBy,
  order?: ProfitabilitySortOrder,
): Promise<ProfitabilityOrder[]> {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  if (sortBy) params.set("sortBy", sortBy);
  if (order) params.set("order", order);
  return serverFetch<ProfitabilityOrder[]>(`/profitability/orders?${params.toString()}`);
}

/** GET /profitability/by-client?from=&to=. Solo ADMIN. Margen agregado por cliente, de mayor a menor. */
export function getProfitabilityByClient(
  range: ProfitabilityRange,
): Promise<ProfitabilityClient[]> {
  return serverFetch<ProfitabilityClient[]>(
    `/profitability/by-client?${rangeQuery(range)}`,
  );
}

/** GET /profitability/monthly. Solo ADMIN. Serie de los últimos 12 meses calendario. */
export function getProfitabilityMonthly(): Promise<ProfitabilityMonthPoint[]> {
  return serverFetch<ProfitabilityMonthPoint[]>("/profitability/monthly");
}
