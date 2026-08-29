import type { WorkOrder, WorkOrderEquipment } from "@/lib/api/work-orders";
import type { Client } from "@/lib/api/clients";
import type { Company } from "@/lib/api/company";
import type { Attachment } from "@/lib/api/attachments";
import type { WorkOrderPartsSummary } from "@/lib/api/work-order-parts";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/document-type";
import { ORDER_STATUS_LABELS } from "@/components/shared/status-chip";
import { PRIORITY_LABELS } from "@/components/shared/priority-badge";
import { SERVICE_TYPE_LABELS } from "@/components/shared/service-type-badge";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate } from "@/lib/format/dates";
import { formatCurrency } from "@/lib/format/currency";
import { cn } from "@/lib/utils";
import { cloudinaryUrl } from "@/lib/image/cloudinary-url";
import { SignatureLine } from "@/components/shared/signature-line";
import { PrintLetterhead, PRINT_BRAND_BLUE as BRAND_BLUE } from "./print-letterhead";

interface WorkOrderPrintDocumentProps {
  order: WorkOrder;
  /** Vacío en órdenes de servicio locativo — el bloque "Equipo(s)" se omite. */
  equipments: WorkOrderEquipment[];
  client: Client;
  company: Company;
  partsSummary: WorkOrderPartsSummary;
  photos: Attachment[];
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
        {label}
      </span>
      <span className="text-sm break-words text-neutral-900">{value || "—"}</span>
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

function SectionTitle({ children }: { children: string }) {
  return (
    <h2
      className="border-b pb-1 text-xs font-semibold tracking-wide uppercase"
      style={{ color: BRAND_BLUE, borderColor: "#BFDBFE" }}
    >
      {children}
    </h2>
  );
}

function Callout({
  variant,
  title,
  children,
}: {
  variant: "amber" | "blue" | "green";
  title: string;
  children: string;
}) {
  return (
    <div
      className={cn(
        "print-color-exact rounded-md border-l-4 p-4",
        variant === "amber"
          ? "border-amber-500 bg-amber-50 text-amber-900"
          : variant === "blue"
            ? "border-blue-500 bg-blue-50 text-blue-900"
            : "border-green-600 bg-green-50 text-green-900",
      )}
    >
      <p className="mb-1 text-xs font-semibold tracking-wide uppercase">{title}</p>
      <p className="text-sm whitespace-pre-wrap">{children}</p>
    </div>
  );
}

function BillingRow({
  label,
  value,
  currency,
  negative,
  className,
}: {
  label: string;
  value: string;
  currency: string;
  negative?: boolean;
  className?: string;
}) {
  return (
    <tr className={className}>
      <td className="py-1 pr-2 text-neutral-700">{label}</td>
      <td className="py-1 text-right text-neutral-900">
        {negative ? "− " : ""}
        {formatCurrency(value, currency)}
      </td>
    </tr>
  );
}

function SignatureBox({
  title,
  signatureImageUrl,
}: {
  title: string;
  /** Solo el lado de quien EMITE el documento pasa esto — el del cliente nunca. */
  signatureImageUrl?: string | null;
}) {
  return (
    <div className="flex flex-col gap-8">
      <SignatureLine signatureImageUrl={signatureImageUrl} />
      <div className="flex flex-col gap-3 text-xs text-neutral-600">
        <span className="font-medium text-neutral-800">{title}</span>
        <span>Nombre: ____________________________</span>
        <span>Documento: ____________________________</span>
      </div>
    </div>
  );
}

export function WorkOrderPrintDocument({
  order,
  equipments,
  client,
  company,
  partsSummary,
  photos,
}: WorkOrderPrintDocumentProps) {
  const billing = partsSummary.billing;
  // RBAC financiero: billing/totalSale/unitPrice vienen omitidos del todo
  // para TECHNICIAN (ver WorkOrderPartsService.listParts) — sin ningún
  // valor que mostrar en este informe.
  const hasFinancials = billing !== undefined && partsSummary.totalSale !== undefined;
  const conceptsTotal = (partsSummary.concepts ?? []).reduce(
    (sum, concept) => sum + Number(concept.quantity) * Number(concept.unitPrice),
    0,
  );

  const documentLabel =
    client.documentType && client.documentNumber
      ? `${DOCUMENT_TYPE_LABELS[client.documentType as DocumentType] ?? client.documentType} ${client.documentNumber}`
      : null;

  const clientMeta = documentLabel ? `${client.name} · ${documentLabel}` : client.name;

  // Pie fijo de cada hoja impresa: sitio web (o correo/teléfono si no hay)
  // + la atribución del producto. Nunca ambos vacíos: "Documento generado
  // por FixTrack Pro" siempre está presente.
  const footerContact = company.website || company.email || company.phone;
  const printFooterText = footerContact
    ? `${footerContact} · Documento generado por FixTrack Pro`
    : "Documento generado por FixTrack Pro";

  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-6 text-neutral-900 sm:p-10 print:w-full print:max-w-none print:p-0">
      <PrintLetterhead company={company} />

      <hr className="mt-4 border-t-4" style={{ borderColor: BRAND_BLUE }} />

      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 print:bg-transparent">
        <MetaItem
          label="Documento"
          value={`Orden de trabajo ${formatOrderNumber(order.orderNumber)}`}
        />
        <MetaItem label="Fecha" value={formatDate(order.createdAt)} />
        <MetaItem label="Cliente" value={clientMeta} />
        <MetaItem label="Estado" value={ORDER_STATUS_LABELS[order.status]} />
        <MetaItem label="Tipo de servicio" value={SERVICE_TYPE_LABELS[order.serviceType]} />
      </div>

      <section className="mt-6 flex flex-col gap-3">
        <SectionTitle>Datos del cliente</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Nombre" value={client.name} />
          <Field label="Documento" value={documentLabel} />
          <Field label="Teléfono" value={client.phone} />
          <Field label="Correo" value={client.email} />
          <Field label="Dirección" value={client.address} />
        </div>
      </section>

      {equipments.length === 1 && (
        <section className="mt-6 flex flex-col gap-3">
          <SectionTitle>Equipo</SectionTitle>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Field label="Marca" value={equipments[0].brand} />
            <Field label="Modelo" value={equipments[0].model} />
            <Field label="Serial" value={equipments[0].serialNumber} />
            <Field label="Ubicación" value={equipments[0].location} />
            <Field label="Código QR" value={equipments[0].qrCode} />
          </div>
        </section>
      )}

      {equipments.length > 1 && (
        <section className="mt-6 flex flex-col gap-3">
          <SectionTitle>{`Equipos (${equipments.length})`}</SectionTitle>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-400 text-left text-[11px] tracking-wide text-neutral-500 uppercase">
                <th className="py-1.5 pr-2 font-medium">Marca</th>
                <th className="py-1.5 pr-2 font-medium">Modelo</th>
                <th className="py-1.5 pr-2 font-medium">Serial</th>
                <th className="py-1.5 font-medium">Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {equipments.map((item) => (
                <tr key={item.id} className="break-inside-avoid border-b border-neutral-200">
                  <td className="py-1.5 pr-2">{item.brand}</td>
                  <td className="py-1.5 pr-2">{item.model}</td>
                  <td className="py-1.5 pr-2 text-neutral-600">
                    {item.serialNumber ?? "—"}
                  </td>
                  <td className="py-1.5 text-neutral-600">{item.location ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="mt-6 flex flex-col gap-4">
        <SectionTitle>Servicio realizado</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Técnico asignado" value={order.user?.name ?? null} />
          <Field label="Prioridad" value={PRIORITY_LABELS[order.priority]} />
        </div>
        <Field label="Descripción" value={order.description} />
      </section>

      {order.diagnosis && (
        <div className="mt-4 break-inside-avoid">
          <Callout variant="amber" title="Hallazgo técnico / Diagnóstico">
            {order.diagnosis}
          </Callout>
        </div>
      )}

      {order.observations && (
        <div className="mt-4 break-inside-avoid">
          <Callout variant="blue" title="Observaciones y recomendaciones">
            {order.observations}
          </Callout>
        </div>
      )}

      {order.suggestions && (
        <div className="mt-4 break-inside-avoid">
          <Callout variant="green" title="Sugerencias y recomendaciones">
            {order.suggestions}
          </Callout>
        </div>
      )}

      <section className="mt-6 flex flex-col gap-3">
        <SectionTitle>Repuestos</SectionTitle>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-400 text-left text-[11px] tracking-wide text-neutral-500 uppercase">
              <th className="py-1.5 pr-2 font-medium">Repuesto</th>
              <th className="py-1.5 pr-2 font-medium">SKU</th>
              <th className="py-1.5 pr-2 text-right font-medium">Cant.</th>
              {hasFinancials && (
                <>
                  <th className="py-1.5 pr-2 text-right font-medium">
                    Precio unitario
                  </th>
                  <th className="py-1.5 text-right font-medium">Subtotal</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {partsSummary.items.length === 0 ? (
              <tr>
                <td
                  colSpan={hasFinancials ? 5 : 3}
                  className="py-3 text-center text-neutral-500"
                >
                  No se utilizaron repuestos en esta orden.
                </td>
              </tr>
            ) : (
              partsSummary.items.map((item) => {
                const unitPrice =
                  item.unitPrice !== undefined ? Number(item.unitPrice) : undefined;
                const subtotal =
                  unitPrice !== undefined ? unitPrice * item.quantity : undefined;
                return (
                  <tr key={item.id} className="break-inside-avoid border-b border-neutral-200">
                    <td className="py-1.5 pr-2">{item.sparePart.name}</td>
                    <td className="py-1.5 pr-2 text-neutral-600">
                      {item.sparePart.sku}
                    </td>
                    <td className="py-1.5 pr-2 text-right">{item.quantity}</td>
                    {hasFinancials && unitPrice !== undefined && subtotal !== undefined && (
                      <>
                        <td className="py-1.5 pr-2 text-right">
                          {formatCurrency(unitPrice, company.currency)}
                        </td>
                        <td className="py-1.5 text-right">
                          {formatCurrency(subtotal, company.currency)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Conceptos: describen lo que se ejecutó, así que se muestran sin
          costos incluso cuando hasFinancials es true — a diferencia de la
          tabla de repuestos de arriba. Omitido por completo si la orden no
          tiene conceptos o si el rol no los recibe (ver
          WorkOrderPartsService.listParts: TECHNICIAN nunca recibe
          partsSummary.concepts). */}
      {partsSummary.concepts && partsSummary.concepts.length > 0 && (
        <section className="mt-6 flex flex-col gap-3">
          <SectionTitle>Conceptos</SectionTitle>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-400 text-left text-[11px] tracking-wide text-neutral-500 uppercase">
                <th className="py-1.5 pr-2 font-medium">Descripción</th>
                <th className="py-1.5 text-right font-medium">Cant.</th>
              </tr>
            </thead>
            <tbody>
              {partsSummary.concepts.map((concept) => (
                <tr key={concept.id} className="break-inside-avoid border-b border-neutral-200">
                  <td className="py-1.5 pr-2">{concept.description}</td>
                  <td className="py-1.5 text-right">{concept.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {hasFinancials && billing && (
        <section className="mt-4 flex flex-col gap-2 break-inside-avoid">
          <SectionTitle>Cierre económico</SectionTitle>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <BillingRow label="Repuestos" value={partsSummary.totalSale!} currency={company.currency} />
              {conceptsTotal > 0 && (
                <BillingRow
                  label="Conceptos"
                  value={conceptsTotal.toFixed(2)}
                  currency={company.currency}
                />
              )}
              <BillingRow label="Mano de obra" value={billing.laborAmount} currency={company.currency} />
              {Number(billing.additionalAmount) > 0 && (
                <BillingRow
                  label={billing.additionalDescription ?? "Otros cargos"}
                  value={billing.additionalAmount}
                  currency={company.currency}
                />
              )}
              {Number(billing.discountAmount) > 0 && (
                <BillingRow
                  label="Descuento"
                  value={billing.discountAmount}
                  currency={company.currency}
                  negative
                />
              )}
              <BillingRow
                label="Subtotal"
                value={billing.subtotal}
                currency={company.currency}
                className="border-t border-neutral-300 font-semibold"
              />
              {Number(billing.taxRate) > 0 && (
                <BillingRow
                  label={`IVA (${Number(billing.taxRate)}%)`}
                  value={billing.taxAmount}
                  currency={company.currency}
                />
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-2 text-right text-base font-bold uppercase">
                  Total a pagar
                </td>
                <td
                  className="pt-2 text-right text-base font-bold"
                  style={{ color: BRAND_BLUE }}
                >
                  {formatCurrency(billing.total, company.currency)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="flex flex-col gap-0.5 text-xs text-neutral-600">
            <span>Pago a {client.paymentTermDays} días</span>
            {Number(billing.paidAmount) > 0 && (
              <span className="font-medium text-neutral-800">
                Saldo pendiente:{" "}
                {formatCurrency(
                  Math.max(Number(billing.total) - Number(billing.paidAmount), 0),
                  company.currency,
                )}
              </span>
            )}
          </div>
        </section>
      )}

      {photos.length > 0 && (
        <section className="mt-6 flex flex-col gap-3">
          <SectionTitle>Archivo fotográfico</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square overflow-hidden rounded-md border border-neutral-200 break-inside-avoid"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- foto remota en Cloudinary, sin dominio fijo que declarar */}
                <img
                  src={cloudinaryUrl(photo.url, "print")}
                  alt="Foto de la orden"
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-10 flex flex-col gap-8 break-inside-avoid">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
          <SignatureBox
            title="Técnico responsable"
            signatureImageUrl={
              company.signatureInWorkOrder ? company.signatureImageUrl : null
            }
          />
          <SignatureBox title="Recibido por el cliente" />
        </div>
        {/* En pantalla se ve acá; al imprimir la reemplaza el pie fijo de abajo,
            que se repite en TODAS las hojas (esta solo aparecería en la última). */}
        <p className="text-center text-[11px] text-neutral-400 print:hidden">
          Documento generado por FixTrack Pro
        </p>
      </footer>

      {/* Pie fijo de impresión: position:fixed en contexto de impresión se
          repite en cada hoja, dentro del margen inferior reservado por
          @page (ver globals.css) — ya no puede solaparse con contenido. */}
      <p className="hidden bg-white py-2 text-center text-[10px] text-neutral-400 print:fixed print:inset-x-0 print:bottom-0 print:z-10 print:block">
        {printFooterText}
      </p>
    </div>
  );
}
