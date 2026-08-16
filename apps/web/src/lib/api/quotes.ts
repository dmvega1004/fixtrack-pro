import { cache } from "react";
import { serverFetch } from "./server-fetch";

// Debe reflejar exactamente el enum QuoteStatus de packages/database/prisma/schema.prisma
export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";

/** Filtro de listado: EXPIRED no es un QuoteStatus real — se deriva en el backend. */
export type QuoteStatusFilter = QuoteStatus | "EXPIRED";

export interface QuoteClient {
  id: string;
  name: string;
  documentType: string | null;
  documentNumber: string | null;
}

export interface QuoteEquipment {
  id: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  location: string | null;
}

export interface QuoteItem {
  id: string;
  position: number;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  sparePartId: string | null;
}

export interface QuoteBilling {
  subtotal: string;
  discountAmount: string;
  base: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  /** true a partir de SENT: el total mostrado es el guardado, no se recalcula. */
  isFrozen: boolean;
}

// Debe reflejar exactamente QuoteView en packages/backend/src/quotes/quotes.service.ts
export interface Quote {
  id: string;
  companyId: string;
  clientId: string;
  /** null mientras sigue en DRAFT — se asigna al enviar. */
  quoteNumber: number | null;
  title: string;
  siteName: string | null;
  scope: string;
  status: QuoteStatus;
  discountAmount: string;
  /** Congelados al enviar; null mientras sigue en DRAFT. */
  taxRateApplied: string | null;
  subtotalAmount: string | null;
  totalAmount: string | null;
  paymentTerms: string | null;
  deliveryTime: string | null;
  warrantyTerms: string | null;
  exclusions: string | null;
  validityDays: number;
  validUntil: string | null;
  sentAt: string | null;
  followUpAt: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
  sourceWorkOrderId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  client: QuoteClient;
  equipments: QuoteEquipment[];
  items: QuoteItem[];
  createdBy: { id: string; name: string } | null;
  billing: QuoteBilling;
  /** Derivado al leer (SENT + validUntil pasada) — nunca guardado. */
  isExpired: boolean;
}

export interface QuoteItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  sparePartId?: string;
}

export interface CreateQuoteInput {
  clientId: string;
  title: string;
  siteName?: string;
  scope: string;
  equipmentIds?: string[];
  items: QuoteItemInput[];
  discountAmount?: number;
  paymentTerms?: string;
  deliveryTime?: string;
  warrantyTerms?: string;
  exclusions?: string;
  validityDays?: number;
}

/** PATCH /quotes/:id — solo aplica en DRAFT, salvo followUpAt (ver backend). */
export type UpdateQuoteInput = Partial<CreateQuoteInput> & { followUpAt?: string };

export interface DecideQuoteInput {
  status: "ACCEPTED" | "REJECTED";
  /** Obligatorio si status="REJECTED". */
  rejectionReason?: string;
}

export interface QuoteFilters {
  status?: QuoteStatusFilter;
  /** Número de cotización, nombre/documento del cliente o título. */
  search?: string;
  take?: number;
  skip?: number;
}

function buildQuoteQuery(filters: QuoteFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.take !== undefined) params.set("take", String(filters.take));
  if (filters.skip !== undefined) params.set("skip", String(filters.skip));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** GET /quotes[?status=&search=&take=&skip=]. Solo ADMIN/COORDINATOR (403 para Técnico). */
export function getQuotes(filters: QuoteFilters = {}): Promise<Quote[]> {
  return serverFetch<Quote[]>(`/quotes${buildQuoteQuery(filters)}`);
}

/** GET /quotes/count — mismos filtros que arriba (menos take/skip). */
export async function getQuotesCount(
  filters: Omit<QuoteFilters, "take" | "skip"> = {},
): Promise<number> {
  const { count } = await serverFetch<{ count: number }>(
    `/quotes/count${buildQuoteQuery(filters)}`,
  );
  return count;
}

export const getQuote = cache((id: string): Promise<Quote> => {
  return serverFetch<Quote>(`/quotes/${id}`);
});

export function createQuote(dto: CreateQuoteInput): Promise<Quote> {
  return serverFetch<Quote>("/quotes", { method: "POST", body: dto });
}

/** PATCH /quotes/:id. 409 si la cotización ya fue enviada y el body trae algo distinto de followUpAt. */
export function updateQuote(id: string, dto: UpdateQuoteInput): Promise<Quote> {
  return serverFetch<Quote>(`/quotes/${id}`, { method: "PATCH", body: dto });
}

/** POST /quotes/:id/send — DRAFT → SENT: asigna número y congela valores. */
export function sendQuote(id: string): Promise<Quote> {
  return serverFetch<Quote>(`/quotes/${id}/send`, { method: "POST" });
}

/** POST /quotes/:id/decide — SENT → ACCEPTED/REJECTED. */
export function decideQuote(id: string, dto: DecideQuoteInput): Promise<Quote> {
  return serverFetch<Quote>(`/quotes/${id}/decide`, { method: "POST", body: dto });
}

/** POST /quotes/:id/duplicate — nuevo DRAFT con los mismos datos e ítems, sin número. */
export function duplicateQuote(id: string): Promise<Quote> {
  return serverFetch<Quote>(`/quotes/${id}/duplicate`, { method: "POST" });
}

/** DELETE /quotes/:id — solo DRAFT. */
export function deleteQuote(id: string): Promise<Quote> {
  return serverFetch<Quote>(`/quotes/${id}`, { method: "DELETE" });
}
