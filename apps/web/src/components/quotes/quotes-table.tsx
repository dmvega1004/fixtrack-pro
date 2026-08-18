import Link from "next/link";
import type { Quote } from "@/lib/api/quotes";
import { QuoteStatusChip } from "@/components/shared/quote-status-chip";
import { QuoteValidityChip } from "./quote-validity-chip";
import { formatQuoteNumber } from "@/lib/format/quote-number";
import { formatCurrency } from "@/lib/format/currency";
import { daysUntilDateOnly } from "@/lib/format/date-only";

interface QuotesTableProps {
  quotes: Quote[];
  currency: string;
  /** Vista "por seguir": agrega la columna de días transcurridos desde el envío. */
  showDaysSinceSent?: boolean;
}

function daysSinceSentLabel(sentAt: string | null): string {
  if (!sentAt) return "—";
  const days = -daysUntilDateOnly(sentAt);
  return `${days} día${days === 1 ? "" : "s"}`;
}

/** Listado de cotizaciones: tabla en escritorio, tarjetas en móvil — mismo patrón que ReceivablesPanel. */
export function QuotesTable({ quotes, currency, showDaysSinceSent = false }: QuotesTableProps) {
  if (quotes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        No hay cotizaciones en este filtro.
      </p>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-28 px-4 py-3 font-medium">Número</th>
              <th className="w-52 px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="w-32 px-4 py-3 text-right font-medium">Total</th>
              <th className="w-28 px-4 py-3 font-medium">Estado</th>
              <th className="w-40 px-4 py-3 font-medium">Validez</th>
              {showDaysSinceSent && (
                <th className="w-40 px-4 py-3 font-medium">Días transcurridos</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {quotes.map((quote) => {
              const href = `/cotizaciones/${quote.id}`;
              return (
                <tr key={quote.id} className="hover:bg-muted/50">
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-3 font-medium whitespace-nowrap">
                      {formatQuoteNumber(quote.quoteNumber)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block truncate px-4 py-3" title={quote.client.name}>
                      {quote.client.name}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block truncate px-4 py-3 text-muted-foreground">
                      {quote.title}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-3 text-right tabular-nums">
                      {formatCurrency(quote.billing.total, currency)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-3">
                      <QuoteStatusChip status={quote.status} isExpired={quote.isExpired} />
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-3">
                      <QuoteValidityChip quote={quote} />
                    </Link>
                  </td>
                  {showDaysSinceSent && (
                    <td className="p-0">
                      <Link href={href} className="block px-4 py-3 tabular-nums">
                        {daysSinceSentLabel(quote.sentAt)}
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {quotes.map((quote) => (
          <Link
            key={quote.id}
            href={`/cotizaciones/${quote.id}`}
            className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-blue-600">
                {formatQuoteNumber(quote.quoteNumber)}
              </span>
              <QuoteStatusChip status={quote.status} isExpired={quote.isExpired} />
            </div>
            <span className="text-sm font-medium">{quote.client.name}</span>
            <span className="truncate text-xs text-muted-foreground">{quote.title}</span>
            <div className="mt-1 flex items-center justify-between text-sm">
              <QuoteValidityChip quote={quote} />
              <span className="font-semibold">{formatCurrency(quote.billing.total, currency)}</span>
            </div>
            {showDaysSinceSent && (
              <span className="text-xs text-muted-foreground">
                Enviada hace {daysSinceSentLabel(quote.sentAt)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
