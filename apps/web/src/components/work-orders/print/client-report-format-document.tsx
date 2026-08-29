import type { WorkOrder } from "@/lib/api/work-orders";
import type { Client, ReportFormatSource } from "@/lib/api/clients";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate, formatTime } from "@/lib/format/dates";

/** Color de acento por defecto si el cliente no configuró uno (raro: el color picker siempre trae un valor). */
const FALLBACK_ACCENT_COLOR = "#2563EB";

/** Altura mínima de una sección EMPTY: suficiente para escribir a mano. */
const EMPTY_SECTION_MIN_HEIGHT = "42mm";

interface ClientReportFormatDocumentProps {
  order: WorkOrder;
  client: Client;
}

function sectionContent(order: WorkOrder, source: ReportFormatSource | null): string {
  switch (source) {
    case "DESCRIPTION":
      return order.description;
    case "DIAGNOSIS":
      return order.diagnosis ?? "";
    case "OBSERVATIONS":
      return order.observations ?? "";
    case "EMPTY":
    default:
      return "";
  }
}

function DataCell({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: string;
  accentColor: string;
}) {
  return (
    <div className="flex flex-1 overflow-hidden rounded-md border border-neutral-300">
      <span
        className="print-color-exact flex w-28 shrink-0 items-center px-2.5 py-2 text-[11px] font-semibold tracking-wide text-white uppercase"
        style={{ backgroundColor: accentColor }}
      >
        {label}
      </span>
      <span className="flex flex-1 items-center px-2.5 py-2 text-sm text-neutral-900">
        {/* Espacio de no separación: una celda vacía (ej. Cliente sin
            endClientName) debe mantener su altura, no colapsar. */}
        {value || " "}
      </span>
    </div>
  );
}

function ReportSection({
  label,
  content,
  accentColor,
}: {
  label: string;
  content: string;
  accentColor: string;
}) {
  const isEmpty = content.trim() === "";

  return (
    <section className="flex flex-col">
      <div
        className="print-color-exact px-3 py-1.5 text-xs font-semibold tracking-wide text-white uppercase"
        style={{ backgroundColor: accentColor }}
      >
        {label || " "}
      </div>
      <div
        className="border border-t-0 border-neutral-300 p-3 text-sm whitespace-pre-wrap text-neutral-900"
        style={isEmpty ? { minHeight: EMPTY_SECTION_MIN_HEIGHT } : undefined}
      >
        {content}
      </div>
    </section>
  );
}

function SignatureColumn({
  title,
  companyValue,
}: {
  title: string;
  companyValue: string;
}) {
  return (
    <div className="flex flex-col gap-8 break-inside-avoid">
      <div className="h-10 border-b border-neutral-400" />
      <div className="flex flex-col gap-2 text-xs text-neutral-700">
        <span className="text-sm font-semibold text-neutral-900">{title}</span>
        <span>Nombre: ____________________________</span>
        <span>Cargo: ____________________________</span>
        <span>
          Empresa: {companyValue ? companyValue : "____________________________"}
        </span>
      </div>
    </div>
  );
}

/**
 * Formato de informe propio del cliente (Módulo de Formatos): documento
 * GENÉRICO, alimentado por completo desde Client.reportFormat* — a
 * propósito NO lleva el logo ni los datos de FixTrack Pro/la empresa que lo
 * usa: quien lo recibe debe ver la identidad del CLIENTE (ver
 * WorkOrdersController + /ordenes/[id]/formato-cliente).
 */
export function ClientReportFormatDocument({
  order,
  client,
}: ClientReportFormatDocumentProps) {
  const accentColor = client.reportFormatAccentColor || FALLBACK_ACCENT_COLOR;
  const title = client.reportFormatTitle ?? "";

  // Fecha → fecha de facturación; si no existe (orden aún no cerrada), la de creación.
  const dateValue = formatDate(order.billedAt ?? order.createdAt);
  // Hora → hora de cierre; billedAt solo existe si la orden ya se cerró.
  const timeValue = order.billedAt ? formatTime(order.billedAt) : "";
  const cityValue = client.city ?? "";
  const endClientValue = order.endClientName ?? "";

  const sections = [
    {
      label: client.reportFormatS1Label ?? "",
      content: sectionContent(order, client.reportFormatS1Source),
    },
    {
      label: client.reportFormatS2Label ?? "",
      content: sectionContent(order, client.reportFormatS2Source),
    },
    {
      label: client.reportFormatS3Label ?? "",
      content: sectionContent(order, client.reportFormatS3Source),
    },
  ];

  const footerText = client.reportFormatFooter ?? "";

  return (
    <div className="mx-auto flex w-full max-w-[210mm] flex-col gap-5 bg-white p-6 text-neutral-900 sm:p-10 print:w-full print:max-w-none print:p-0">
      {/* 1. Encabezado: logo | título centrado | código/versión/fecha */}
      <header className="grid grid-cols-3 items-center gap-4 rounded-lg border border-neutral-300 p-4">
        <div className="flex items-center justify-start">
          {client.reportFormatLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo remoto del CLIENTE en Cloudinary, sin dominio fijo que declarar
            <img
              src={client.reportFormatLogoUrl}
              alt={client.name}
              className="max-h-16 max-w-36 object-contain"
            />
          ) : (
            <div className="h-16 w-36" />
          )}
        </div>
        <p className="text-center text-lg font-bold tracking-wide text-neutral-900 uppercase">
          {title}
        </p>
        <div className="flex flex-col items-end gap-0.5 text-right text-xs text-neutral-600">
          {client.reportFormatCode && (
            <span>
              <span className="font-semibold">Código:</span> {client.reportFormatCode}
            </span>
          )}
          {client.reportFormatVersion && (
            <span>
              <span className="font-semibold">Versión:</span> {client.reportFormatVersion}
            </span>
          )}
          {client.reportFormatDate && (
            <span>
              <span className="font-semibold">Fecha:</span> {client.reportFormatDate}
            </span>
          )}
        </div>
      </header>

      {/* 2. Fila de datos */}
      <div className="flex flex-col gap-2 break-inside-avoid">
        <div className="grid grid-cols-2 gap-2">
          <DataCell label="Fecha" value={dateValue} accentColor={accentColor} />
          <DataCell label="Ciudad" value={cityValue} accentColor={accentColor} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DataCell label="Cliente" value={endClientValue} accentColor={accentColor} />
          <DataCell label="Hora" value={timeValue} accentColor={accentColor} />
        </div>
      </div>

      {/* 3. Las tres secciones */}
      <div className="flex flex-col gap-4">
        {sections.map((section, index) => (
          <ReportSection
            key={index}
            label={section.label}
            content={section.content}
            accentColor={accentColor}
          />
        ))}
      </div>

      {/* 4. Bloque de firmas */}
      <div className="mt-4 grid grid-cols-1 gap-10 sm:grid-cols-2">
        <SignatureColumn
          title="ENTREGA"
          companyValue={client.reportFormatIssuer ?? ""}
        />
        <SignatureColumn title="RECIBE" companyValue="" />
      </div>

      {/* 5. Pie de página: repetido en cada hoja (position:fixed en
          impresión, igual patrón que /imprimir y /cuenta-de-cobro). Sin
          numeración de página real: Chrome no soporta las cajas de margen
          de @page (counter(page)/counter(pages)) al imprimir vía
          window.print() — la única numeración que ofrece es el
          "Encabezados y pies de página" nativo del diálogo de impresión,
          que este proyecto pide desactivar (ver @page en globals.css)
          porque se superpone con este mismo pie. Ver reporte de la tarea. */}
      {footerText && (
        <p className="mt-2 text-center text-[11px] print:hidden" style={{ color: accentColor }}>
          {footerText}
        </p>
      )}
      {footerText && (
        <p
          className="hidden bg-white py-2 text-center text-[10px] print:fixed print:inset-x-0 print:bottom-0 print:z-10 print:block"
          style={{ color: accentColor }}
        >
          {footerText}
        </p>
      )}
    </div>
  );
}

export function clientReportFormatFileTitle(order: WorkOrder): string {
  return `${formatOrderNumber(order.orderNumber)} - ${order.client.name}`;
}
