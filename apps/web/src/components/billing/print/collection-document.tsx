import type { ReactNode } from "react";
import type { WorkOrder, WorkOrderEquipment } from "@/lib/api/work-orders";
import type { Client } from "@/lib/api/clients";
import type { Company } from "@/lib/api/company";
import type { WorkOrderPartsSummary } from "@/lib/api/work-order-parts";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/document-type";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatCollectionNumber } from "@/lib/format/collection-number";
import { formatDate } from "@/lib/format/dates";
import { formatCurrency } from "@/lib/format/currency";
import { formatEquipmentSummary } from "@/lib/format/equipment-summary";
import { amountInWords } from "@/lib/format/number-to-words";
import {
  PrintLetterhead,
  PRINT_BRAND_BLUE as BRAND_BLUE,
} from "@/components/work-orders/print/print-letterhead";
import { SignatureLine } from "@/components/shared/signature-line";
import { PrintDocumentFrame } from "@/components/shared/print-document-frame";
import { PrintKeepTogether } from "@/components/shared/print-keep-together";

const DEFAULT_FOOTNOTE =
  "Este documento constituye una solicitud de pago y no equivale a factura electrónica de venta.";

const DAY_MS = 24 * 60 * 60 * 1000;

interface CollectionDocumentProps {
  order: WorkOrder;
  equipments: WorkOrderEquipment[];
  client: Client;
  company: Company;
  partsSummary: WorkOrderPartsSummary;
}

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 break-inside-avoid">
      <p
        className="break-after-avoid text-xs font-semibold tracking-wide uppercase"
        style={{ color: BRAND_BLUE }}
      >
        {title}
      </p>
      <div className="flex flex-col gap-0.5 text-sm text-neutral-800">{children}</div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase">
        {label}
      </span>
      <span className="text-[13px] font-medium break-words text-neutral-900">
        {value}
      </span>
    </div>
  );
}

function ValueRow({
  concept,
  quantity,
  unitPrice,
  total,
  currency,
}: {
  concept: string;
  quantity: number;
  unitPrice: number;
  total: number;
  currency: string;
}) {
  return (
    <tr className="break-inside-avoid border-b border-neutral-200">
      <td className="py-1.5 pr-2">{concept}</td>
      <td className="py-1.5 pr-2 text-right">{quantity}</td>
      <td className="py-1.5 pr-2 text-right">{formatCurrency(unitPrice, currency)}</td>
      <td className="py-1.5 text-right">{formatCurrency(total, currency)}</td>
    </tr>
  );
}

function TotalRow({
  label,
  value,
  currency,
  className,
}: {
  label: string;
  value: string;
  currency: string;
  className?: string;
}) {
  return (
    <tr className={className}>
      <td className="py-1 pr-2 text-neutral-700">{label}</td>
      <td className="py-1 text-right text-neutral-900">{formatCurrency(value, currency)}</td>
    </tr>
  );
}

export function CollectionDocument({
  order,
  equipments,
  client,
  company,
  partsSummary,
}: CollectionDocumentProps) {
  // Esta página solo la alcanzan ADMIN/COORDINATOR (TECHNICIAN se redirige
  // en /ordenes/[id]/cuenta-de-cobro/page.tsx antes de llegar acá), así que
  // billing siempre viene presente — ver WorkOrderPartsService.listParts.
  const billing = partsSummary.billing!;
  const currency = company.currency;

  const documentLabel =
    client.documentType && client.documentNumber
      ? `${DOCUMENT_TYPE_LABELS[client.documentType as DocumentType] ?? client.documentType} ${client.documentNumber}`
      : null;

  const payeeName = company.payeeName || company.name;

  // Retenciones (Bloque de retenciones): cuando la orden las tiene, el
  // documento las desglosa después del total y cierra con el neto a
  // pagar — netAmount, nunca total, es la base del saldo. Sin
  // retenciones, netAmount llega igual a total (ver WorkOrder.netAmount
  // en el backend), así que el documento se ve exactamente como antes.
  const hasRetentions = (billing.retentions?.length ?? 0) > 0;
  const netAmount = billing.netAmount ?? billing.total;

  const balance = Math.max(Number(netAmount) - Number(billing.paidAmount), 0);

  const dueDate = order.billedAt
    ? new Date(new Date(order.billedAt).getTime() + client.paymentTermDays * DAY_MS)
    : null;

  const footerContact = company.website || company.email || company.phone;
  const printFooterText = footerContact
    ? `${footerContact} · Documento generado por FixTrack Pro`
    : "Documento generado por FixTrack Pro";

  const valueRows: { concept: string; quantity: number; unitPrice: number; total: number }[] = [];
  if (Number(billing.laborAmount) > 0) {
    valueRows.push({
      concept: "Mano de obra",
      quantity: 1,
      unitPrice: Number(billing.laborAmount),
      total: Number(billing.laborAmount),
    });
  }
  for (const item of partsSummary.items) {
    const unitPrice = Number(item.unitPrice);
    valueRows.push({
      concept: item.sparePart.name,
      quantity: item.quantity,
      unitPrice,
      total: unitPrice * item.quantity,
    });
  }
  for (const concept of partsSummary.concepts ?? []) {
    const quantity = Number(concept.quantity);
    const unitPrice = Number(concept.unitPrice);
    valueRows.push({
      concept: concept.description,
      quantity,
      unitPrice,
      total: unitPrice * quantity,
    });
  }
  if (Number(billing.additionalAmount) > 0) {
    valueRows.push({
      concept: billing.additionalDescription ?? "Otros cargos",
      quantity: 1,
      unitPrice: Number(billing.additionalAmount),
      total: Number(billing.additionalAmount),
    });
  }

  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-6 text-neutral-900 sm:p-10 print:w-full print:max-w-none print:p-0">
      <PrintDocumentFrame
        footer={
          <p className="pt-2 text-center text-[10px] text-neutral-400">
            {printFooterText}
          </p>
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PrintLetterhead company={company} />
          <div className="flex flex-col items-end text-right">
            <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              {company.collectionDocTitle}
            </p>
            <p className="text-3xl font-bold" style={{ color: BRAND_BLUE }}>
              {formatCollectionNumber(order.collectionNumber!)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Fecha de emisión: {formatDate(order.collectionIssuedAt!)}
            </p>
          </div>
        </div>

        <hr className="mt-4 border-t-4" style={{ borderColor: BRAND_BLUE }} />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Box title="A cargo de">
            <span className="font-medium">{client.name}</span>
            {documentLabel && <span className="text-neutral-600">{documentLabel}</span>}
            {client.address && <span className="text-neutral-600">{client.address}</span>}
            {client.phone && <span className="text-neutral-600">{client.phone}</span>}
          </Box>
          <Box title="Debe a">
            <span className="font-medium">{payeeName}</span>
            {company.payeeDocument && (
              <span className="text-neutral-600">{company.payeeDocument}</span>
            )}
          </Box>
        </div>

        <div
          className="print-color-exact mt-6 rounded-md border-l-4 bg-blue-50 p-4 break-inside-avoid"
          style={{ borderColor: BRAND_BLUE }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetaItem label="Orden de trabajo" value={formatOrderNumber(order.orderNumber)} />
            <MetaItem
              label="Fecha del servicio"
              value={order.billedAt ? formatDate(order.billedAt) : "—"}
            />
            <MetaItem
              label="Equipos intervenidos"
              value={formatEquipmentSummary(equipments)}
            />
          </div>
        </div>

        <section className="mt-6 flex flex-col gap-2 break-inside-avoid">
          <p className="break-after-avoid text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Por concepto de
          </p>
          <p className="text-sm break-words text-neutral-900">{order.description}</p>
        </section>

        <section className="mt-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="break-after-avoid border-b border-neutral-400 text-left text-[11px] tracking-wide text-neutral-500 uppercase">
                <th className="py-1.5 pr-2 font-medium">Concepto</th>
                <th className="py-1.5 pr-2 text-right font-medium">Cantidad</th>
                <th className="py-1.5 pr-2 text-right font-medium">Valor unitario</th>
                <th className="py-1.5 text-right font-medium">Valor total</th>
              </tr>
            </thead>
            <tbody>
              {valueRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-neutral-500">
                    Sin conceptos facturados.
                  </td>
                </tr>
              ) : (
                valueRows.map((row, index) => (
                  <ValueRow key={index} {...row} currency={currency} />
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Fila de tabla propia (ver PrintKeepTogether): la tabla de
            totales, la barra de "Saldo a pagar" y el monto en letras son
            un solo cierre económico — si no caben en lo que resta de la
            hoja, se mueven completos a la siguiente, nunca partidos entre
            sí. pt-6 es padding, no margin: no se pierde si el bloque abre
            hoja nueva. */}
        <PrintKeepTogether className="pt-6">
          <section className="flex justify-end">
            <table className="w-72 border-collapse text-sm">
              <tbody>
                {Number(billing.discountAmount) > 0 && (
                  <tr>
                    <td className="py-1 pr-2 text-neutral-700">Descuento</td>
                    <td className="py-1 text-right text-neutral-900">
                      − {formatCurrency(billing.discountAmount, currency)}
                    </td>
                  </tr>
                )}
                <TotalRow label="Subtotal" value={billing.subtotal} currency={currency} />
                {Number(billing.taxRate) > 0 && (
                  <TotalRow
                    label={`IVA (${Number(billing.taxRate)}%)`}
                    value={billing.taxAmount}
                    currency={currency}
                  />
                )}
                <TotalRow
                  label="Total del servicio"
                  value={billing.total}
                  currency={currency}
                  className="border-t border-neutral-300 font-semibold"
                />
                {hasRetentions &&
                  billing.retentions!.map((retention) => (
                    <tr key={retention.id} className="border-b border-neutral-200">
                      <td className="py-1 pr-2 text-neutral-700">
                        − {retention.name} ({Number(retention.rate)}%)
                      </td>
                      <td className="py-1 text-right text-neutral-900">
                        − {formatCurrency(retention.amount, currency)}
                      </td>
                    </tr>
                  ))}
                {hasRetentions && (
                  <TotalRow
                    label="Neto a recibir"
                    value={netAmount}
                    currency={currency}
                    className="border-t border-neutral-300 font-semibold"
                  />
                )}
                {Number(billing.paidAmount) > 0 && (
                  <tr>
                    <td className="py-1 pr-2 text-green-700">Abonos recibidos</td>
                    <td className="py-1 text-right text-green-700">
                      − {formatCurrency(billing.paidAmount, currency)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="mt-2 flex justify-end">
            <div className="print-color-exact flex w-72 items-center justify-between rounded-md bg-blue-600 px-4 py-3 text-white">
              <span className="text-sm font-bold tracking-wide uppercase">Saldo a pagar</span>
              <span className="text-lg font-bold">{formatCurrency(balance, currency)}</span>
            </div>
          </section>

          <p className="mt-4 text-right text-xs font-medium text-neutral-600 italic">
            {amountInWords(balance, currency)}
          </p>
        </PrintKeepTogether>

        {/* Fila de tabla propia: información de pago + firma institucional
            no se parten entre hojas, y no quedan pegadas al borde superior
            si el bloque completo abre hoja nueva (pt-16 es padding). */}
        <PrintKeepTogether className="pt-16 pb-6">
          <footer className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 text-sm text-neutral-700">
                <p
                  className="break-after-avoid text-xs font-semibold tracking-wide uppercase"
                  style={{ color: BRAND_BLUE }}
                >
                  Información para pago
                </p>
                <span>Titular: {payeeName}</span>
                {company.bankName && <span>Entidad: {company.bankName}</span>}
                {company.bankAccount && <span>Cuenta: {company.bankAccount}</span>}
                <span>Condiciones: pago a {client.paymentTermDays} días</span>
                {dueDate && <span>Fecha de vencimiento: {formatDate(dueDate)}</span>}
              </div>

              {company.signerName && (
                <div className="flex flex-col gap-8">
                  <SignatureLine
                    signatureImageUrl={
                      company.signatureInCollection ? company.signatureImageUrl : null
                    }
                  />
                  <div className="flex flex-col text-sm text-neutral-800">
                    <span className="font-medium">{company.signerName}</span>
                    {company.signerRole && (
                      <span className="text-xs text-neutral-500">{company.signerRole}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-neutral-500 italic">
              {company.collectionDocFootnote ?? DEFAULT_FOOTNOTE}
            </p>
          </footer>
        </PrintKeepTogether>
      </PrintDocumentFrame>
    </div>
  );
}
