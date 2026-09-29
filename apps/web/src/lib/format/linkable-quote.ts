import type { LinkableQuote } from "@/lib/api/work-orders";
import type { QuoteStatus } from "@/lib/api/quotes";
import { formatDate } from "./dates";
import { formatQuoteNumber } from "./quote-number";

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
};

/** "COT-0131 — Reemplazo circuito de control motobomba 3 (Aceptada · 28 sept 2026)". Sin montos. */
export function formatLinkableQuoteLabel(quote: LinkableQuote): string {
  const date = quote.date ? ` · ${formatDate(quote.date)}` : "";
  return `${formatQuoteNumber(quote.quoteNumber)} — ${quote.title} (${STATUS_LABELS[quote.status]}${date})`;
}
