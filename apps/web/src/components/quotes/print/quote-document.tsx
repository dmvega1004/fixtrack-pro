import type { ReactNode } from "react";
import type { Quote } from "@/lib/api/quotes";
import type { Client } from "@/lib/api/clients";
import type { Company } from "@/lib/api/company";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/document-type";
import { formatQuoteNumber } from "@/lib/format/quote-number";
import { formatDate } from "@/lib/format/dates";
import {
  addDaysToDateOnly,
  formatDateOnly,
  todayDateInputValue,
} from "@/lib/format/date-only";
import { formatCurrency } from "@/lib/format/currency";
import { amountInWords } from "@/lib/format/number-to-words";
import { cn } from "@/lib/utils";

const BRAND_BLUE = "#2563EB";

const DEFAULT_FOOTNOTE =
  "Esta cotización no constituye factura de venta. Los precios están sujetos a disponibilidad de inventario y pueden variar una vez vencida la validez de la oferta.";

interface QuoteDocumentProps {
  quote: Quote;
  client: Client;
  company: Company;
}

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4">
      <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: BRAND_BLUE }}>
        {title}
      </p>
      <div className="flex flex-col gap-0.5 text-sm text-neutral-800">{children}</div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <tr className={className}>
      <td className="py-1 pr-2 text-neutral-700">{label}</td>
      <td className="py-1 text-right text-neutral-900 tabular-nums">{value}</td>
    </tr>
  );
}

function ConditionField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase">
        {label}
      </span>
      <span className="text-sm text-neutral-900">{value}</span>
    </div>
  );
}

/** 0 equipos = no se muestra la línea, 1 = "Marca Modelo", varios = "N equipos". */
function equipmentSummary(equipments: Quote["equipments"]): string | null {
  if (equipments.length === 0) return null;
  if (equipments.length === 1) return `${equipments[0].brand} ${equipments[0].model}`;
  return `${equipments.length} equipos`;
}

/**
 * Documento de cotización — usado tanto para la cotización YA EMITIDA
 * (número real, valores congelados) como para la VISTA PREVIA de un
 * borrador (marca de agua + fechas de ejemplo, calculadas igual que las
 * calcularía POST /quotes/:id/send si se emitiera hoy). Es la MISMA vista
 * en los dos casos, con las diferencias mínimas que exige un borrador —
 * no dos componentes separados que puedan divergir.
 */
export function QuoteDocument({ quote, client, company }: QuoteDocumentProps) {
  const isDraft = quote.status === "DRAFT";
  const currency = company.currency;

  const documentLabel =
    client.documentType && client.documentNumber
      ? `${DOCUMENT_TYPE_LABELS[client.documentType as DocumentType] ?? client.documentType} ${client.documentNumber}`
      : null;

  // En borrador no hay sentAt/validUntil todavía (se calculan recién al
  // emitir) — se muestra una previsualización con la misma fórmula que usa
  // el backend (hoy y hoy + validityDays), para que el documento se vea
  // igual a como quedaría si se emite en este momento.
  const emittedAtLabel = isDraft
    ? formatDateOnly(todayDateInputValue())
    : formatDate(quote.sentAt!);
  const validUntilLabel = isDraft
    ? formatDateOnly(addDaysToDateOnly(todayDateInputValue(), quote.validityDays))
    : formatDateOnly(quote.validUntil!);

  const equipmentLine = equipmentSummary(quote.equipments);
  const footerContact = company.website || company.email || company.phone;
  const printFooterText = footerContact
    ? `${footerContact} · Documento generado por FixTrack Pro`
    : "Documento generado por FixTrack Pro";

  const hasAnyCommercialTerm =
    quote.paymentTerms || quote.deliveryTime || quote.warrantyTerms;

  return (
    <div className="relative mx-auto w-full max-w-[210mm] overflow-hidden bg-white p-6 text-neutral-900 sm:p-10 print:w-[216mm] print:max-w-none print:overflow-visible print:px-[14mm] print:pt-[12mm] print:pb-[18mm]">
      {isDraft && (
        <div
          aria-hidden
          className="print-color-exact pointer-events-none fixed inset-0 z-20 flex items-center justify-center overflow-hidden print:fixed"
        >
          <span className="rotate-[-35deg] text-[16vw] font-black tracking-widest text-neutral-300/70 select-none sm:text-[140px]">
            BORRADOR
          </span>
        </div>
      )}

      {/* 1. Membrete */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {company.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- logo remoto (Cloudinary), sin dominio fijo que declarar
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-12 w-auto object-contain"
            />
          )}
          <div className="flex flex-col">
            <p className="text-2xl font-bold" style={{ color: BRAND_BLUE }}>
              {company.name}
            </p>
            {company.taxId && (
              <p className="text-xs text-neutral-500">NIT {company.taxId}</p>
            )}
            <p className="mt-1 text-xs text-neutral-500">
              {[company.address, company.phone, company.email, company.website]
                .filter(Boolean)
                .join("  |  ")}
            </p>
          </div>
        </div>

        {/* 2. Cabecera */}
        <div className="flex flex-col items-end text-right">
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Cotización
          </p>
          <p
            className={cn("font-bold", isDraft ? "text-xl" : "text-3xl")}
            style={{ color: BRAND_BLUE }}
          >
            {isDraft ? "BORRADOR — sin emitir" : formatQuoteNumber(quote.quoteNumber)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Fecha de emisión: {emittedAtLabel}</p>
          <p className="text-xs text-neutral-500">Válida hasta: {validUntilLabel}</p>
        </div>
      </header>

      <hr className="mt-4 border-t-4" style={{ borderColor: BRAND_BLUE }} />

      {/* 3. Cliente / sede */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Box title="Cliente">
          <span className="font-medium">{client.name}</span>
          {documentLabel && <span className="text-neutral-600">{documentLabel}</span>}
          {client.phone && <span className="text-neutral-600">{client.phone}</span>}
        </Box>
        <Box title="Sede / Proyecto">
          {quote.siteName && <span className="font-medium">{quote.siteName}</span>}
          {equipmentLine && <span className="text-neutral-600">{equipmentLine}</span>}
          {!quote.siteName && !equipmentLine && (
            <span className="text-neutral-400">—</span>
          )}
        </Box>
      </div>

      {/* 4. Alcance */}
      <section className="mt-6 flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Alcance</p>
        <p className="text-sm whitespace-pre-wrap text-neutral-900">{quote.scope}</p>
      </section>

      {/* 5. Ítems */}
      <section className="mt-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-400 text-left text-[11px] tracking-wide text-neutral-500 uppercase">
              <th className="w-8 py-1.5 pr-2 font-medium">#</th>
              <th className="py-1.5 pr-2 font-medium">Descripción</th>
              <th className="py-1.5 pr-2 text-right font-medium">Cantidad</th>
              <th className="py-1.5 pr-2 text-right font-medium">Valor unitario</th>
              <th className="py-1.5 text-right font-medium">Valor total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => (
              <tr key={item.id} className="border-b border-neutral-200 break-inside-avoid">
                <td className="py-1.5 pr-2 text-neutral-500 tabular-nums">{index + 1}</td>
                <td className="py-1.5 pr-2">{item.description}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{item.quantity}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">
                  {formatCurrency(item.unitPrice, currency)}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatCurrency(item.lineTotal, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 6. Totales */}
      <section className="mt-4 flex justify-end break-inside-avoid">
        <table className="w-72 border-collapse text-sm">
          <tbody>
            <TotalRow label="Subtotal" value={formatCurrency(quote.billing.subtotal, currency)} />
            {Number(quote.billing.discountAmount) > 0 && (
              <TotalRow
                label="Descuento"
                value={`− ${formatCurrency(quote.billing.discountAmount, currency)}`}
              />
            )}
            <TotalRow
              label={`IVA (${Number(quote.billing.taxRate)}%)`}
              value={formatCurrency(quote.billing.taxAmount, currency)}
            />
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-2 text-right text-base font-bold uppercase">Total</td>
              <td
                className="pt-2 text-right text-base font-bold tabular-nums"
                style={{ color: BRAND_BLUE }}
              >
                {formatCurrency(quote.billing.total, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* 7. Total en letras */}
      <p className="mt-2 text-right text-xs font-medium text-neutral-600 italic">
        {amountInWords(quote.billing.total, currency)}
      </p>

      {/* 8. Condiciones comerciales */}
      {(hasAnyCommercialTerm || quote.exclusions) && (
        <section className="mt-6 flex flex-col gap-4 break-inside-avoid">
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Condiciones comerciales
          </p>
          {hasAnyCommercialTerm && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ConditionField label="Forma de pago" value={quote.paymentTerms} />
              <ConditionField label="Tiempo de entrega" value={quote.deliveryTime} />
              <ConditionField label="Garantía" value={quote.warrantyTerms} />
              <ConditionField label="Validez de la oferta" value={`${quote.validityDays} días`} />
            </div>
          )}
          {quote.exclusions && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 print-color-exact">
              <p className="text-[10px] font-semibold tracking-wide text-amber-800 uppercase">
                No incluye
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap text-amber-900">
                {quote.exclusions}
              </p>
            </div>
          )}
        </section>
      )}

      {/* 9. Firmas */}
      <footer className="mt-10 flex flex-col gap-6 break-inside-avoid">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {company.signerName && (
            <div className="flex flex-col gap-8">
              <div className="h-10 border-b border-neutral-400" />
              <div className="flex flex-col text-sm text-neutral-800">
                <span className="text-xs text-neutral-500">Elaborado por</span>
                <span className="font-medium">{company.signerName}</span>
                {company.signerRole && (
                  <span className="text-xs text-neutral-500">{company.signerRole}</span>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-8">
            <div className="h-10 border-b border-neutral-400" />
            <div className="flex flex-col gap-1 text-xs text-neutral-600">
              <span className="font-medium text-neutral-800">Aceptado por el cliente</span>
              <span>Nombre: ____________________________</span>
              <span>Firma: ____________________________</span>
              <span>Fecha: ____________________________</span>
            </div>
          </div>
        </div>

        {/* 10. Nota al pie */}
        <p className="text-center text-xs text-neutral-500 italic">
          {company.quoteFootnote || DEFAULT_FOOTNOTE}
        </p>
        <p className="text-center text-[11px] text-neutral-400 print:hidden">
          Documento generado por FixTrack Pro
        </p>
      </footer>

      <p className="hidden bg-white py-2 text-center text-[10px] text-neutral-400 print:fixed print:inset-x-0 print:bottom-0 print:z-10 print:block">
        {printFooterText}
      </p>
    </div>
  );
}
