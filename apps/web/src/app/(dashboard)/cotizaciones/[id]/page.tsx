import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuote } from "@/lib/api/quotes";
import { getCompany } from "@/lib/api/company";
import { getSession } from "@/lib/session";
import { HttpError } from "@/lib/api/http";
import { QuoteStatusChip } from "@/components/shared/quote-status-chip";
import { QuoteValidityChip } from "@/components/quotes/quote-validity-chip";
import { QuoteActions } from "@/components/quotes/quote-actions";
import { DeleteQuoteButton } from "@/components/quotes/delete-quote-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatQuoteNumber } from "@/lib/format/quote-number";
import { formatCurrency } from "@/lib/format/currency";
import { formatDateOnly } from "@/lib/format/date-only";
import { formatDate } from "@/lib/format/dates";

interface CotizacionDetallePageProps {
  params: Promise<{ id: string }>;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm break-words whitespace-pre-wrap">{value || "—"}</span>
    </div>
  );
}

export default async function CotizacionDetallePage({ params }: CotizacionDetallePageProps) {
  const { id } = await params;

  let quote;
  try {
    quote = await getQuote(id);
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const [company, session] = await Promise.all([getCompany(), getSession()]);
  const isAdmin = session?.role === "ADMIN";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold md:text-3xl">
              {formatQuoteNumber(quote.quoteNumber)}
            </h1>
            <QuoteStatusChip status={quote.status} isExpired={quote.isExpired} />
          </div>
          <QuoteActions quoteId={quote.id} status={quote.status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase">Cliente</span>
            <Link href={`/clientes/${quote.client.id}`} className="font-medium text-primary hover:underline">
              {quote.client.name}
            </Link>
          </div>
          {quote.validUntil && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase">Validez</span>
              <QuoteValidityChip quote={quote} />
            </div>
          )}
          {quote.followUpAt && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase">Seguimiento</span>
              <span className="font-medium">{formatDateOnly(quote.followUpAt)}</span>
            </div>
          )}
        </div>

        <p className="text-sm font-medium">{quote.title}</p>
        {quote.siteName && <p className="text-xs text-muted-foreground">{quote.siteName}</p>}

        {quote.status === "REJECTED" && quote.rejectionReason && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <span className="font-medium">Motivo del rechazo: </span>
            {quote.rejectionReason}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Alcance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{quote.scope}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Creada" value={formatDate(quote.createdAt)} />
            <Field label="Enviada" value={quote.sentAt ? formatDate(quote.sentAt) : null} />
            <Field label="Decidida" value={quote.decidedAt ? formatDate(quote.decidedAt) : null} />
            <Field label="Creada por" value={quote.createdBy?.name ?? null} />
          </CardContent>
        </Card>
      </div>

      {quote.equipments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Equipos involucrados</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quote.equipments.map((equipment) => (
              <Link
                key={equipment.id}
                href={`/equipos/${equipment.id}`}
                className="flex flex-col gap-0.5 rounded-lg border border-border p-3 hover:bg-muted/50"
              >
                <span className="font-medium">
                  {equipment.brand} {equipment.model}
                </span>
                <span className="text-xs text-muted-foreground">
                  {equipment.location ?? equipment.serialNumber ?? "Sin datos adicionales"}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ítems</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Descripción</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cant.</th>
                  <th className="px-4 py-2.5 text-right font-medium">Valor unitario</th>
                  <th className="px-4 py-2.5 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quote.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5">{item.description}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatCurrency(item.unitPrice, company.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatCurrency(item.lineTotal, company.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Condiciones comerciales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Forma de pago" value={quote.paymentTerms} />
            <Field label="Tiempo de entrega" value={quote.deliveryTime} />
            <Field label="Garantía" value={quote.warrantyTerms} />
            <Field label="Exclusiones" value={quote.exclusions} />
            <Field label="Días de validez" value={`${quote.validityDays} días`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valores</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="text-foreground">
                {formatCurrency(quote.billing.subtotal, company.currency)}
              </span>
            </div>
            {Number(quote.billing.discountAmount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Descuento</span>
                <span className="text-foreground">
                  − {formatCurrency(quote.billing.discountAmount, company.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>IVA ({quote.billing.taxRate}%)</span>
              <span className="text-foreground">
                {formatCurrency(quote.billing.taxAmount, company.currency)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(quote.billing.total, company.currency)}</span>
            </div>
            {quote.billing.isFrozen && (
              <p className="mt-1 text-xs text-muted-foreground italic">
                Valores congelados al enviar — no cambian aunque el IVA de la empresa cambie después.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && quote.status === "DRAFT" && (
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-sm font-medium">Zona de riesgo</h2>
          <DeleteQuoteButton
            quoteId={quote.id}
            quoteLabel={formatQuoteNumber(quote.quoteNumber)}
          />
        </div>
      )}
    </div>
  );
}
