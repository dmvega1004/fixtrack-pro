import type { WorkOrder } from "@/lib/api/work-orders";
import type { Client, ReportFormatSource } from "@/lib/api/clients";
import type { Attachment } from "@/lib/api/attachments";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate, formatTime, formatTimeOnly } from "@/lib/format/dates";
import { PrintDocumentFrame } from "@/components/shared/print-document-frame";
import { PrintPhotoGrid } from "@/components/shared/print-photo-grid";

/** Color de acento por defecto si el cliente no configuró uno (raro: el color picker siempre trae un valor). */
const FALLBACK_ACCENT_COLOR = "#2563EB";

/** Altura mínima de una sección EMPTY: suficiente para escribir a mano. */
const EMPTY_SECTION_MIN_HEIGHT = "42mm";

interface ClientReportFormatDocumentProps {
  order: WorkOrder;
  client: Client;
  photos: Attachment[];
}

function sectionContent(order: WorkOrder, source: ReportFormatSource | null): string {
  switch (source) {
    case "DESCRIPTION":
      return order.description;
    case "DIAGNOSIS":
      return order.diagnosis ?? "";
    case "OBSERVATIONS":
      return order.observations ?? "";
    case "SUGGESTIONS":
      return order.suggestions ?? "";
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
        {value || " "}
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
        className="print-color-exact break-after-avoid px-3 py-1.5 text-xs font-semibold tracking-wide text-white uppercase"
        style={{ backgroundColor: accentColor }}
      >
        {label || " "}
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

/**
 * Registro fotográfico: misma franja del color de acento que ReportSection
 * (para que se vea como parte del formato del cliente, no como un injerto
 * del informe propio) seguida de la cuadrícula compartida de fotos (ver
 * PrintPhotoGrid) — con borde en cada fila, no en el contenedor completo.
 * Empieza en hoja nueva (break-before-page): el texto ocupa las hojas
 * anteriores completas y las fotos arrancan limpias en la siguiente, con
 * esta franja de título arriba. Solo se renderiza si hay fotos (ver
 * showPhotos en ClientReportFormatDocument), así que nunca deja una hoja
 * en blanco cuando no las hay.
 */
function PhotosSection({
  label,
  photos,
  accentColor,
}: {
  label: string;
  photos: Attachment[];
  accentColor: string;
}) {
  return (
    <section className="flex flex-col break-before-page">
      <div
        className="print-color-exact break-after-avoid px-3 py-1.5 text-xs font-semibold tracking-wide text-white uppercase"
        style={{ backgroundColor: accentColor }}
      >
        {label}
      </div>
      <PrintPhotoGrid photos={photos} bordered />
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
  photos,
}: ClientReportFormatDocumentProps) {
  const accentColor = client.reportFormatAccentColor || FALLBACK_ACCENT_COLOR;
  const title = client.reportFormatTitle ?? "";
  // El bloque no se renderiza en absoluto (ni la franja) si el cliente
  // desactivó las fotos o si la orden no tiene ninguna — el documento debe
  // verse exactamente igual que hoy en esos casos.
  const showPhotos = client.reportFormatIncludePhotos && photos.length > 0;
  const photosLabel = client.reportFormatPhotosLabel?.trim() || "Registro fotográfico";

  // Fecha → fecha de facturación; si no existe (orden aún no cerrada), la de creación.
  const dateValue = formatDate(order.billedAt ?? order.createdAt);
  // Hora → la que el usuario capturó (serviceTime); si no la cargó, la de
  // cierre (corregida a America/Bogota — ver formatTime); si la orden
  // sigue abierta, en blanco. Cerrar la orden es un acto administrativo
  // que puede ocurrir horas después del trabajo real, así que serviceTime
  // siempre tiene prioridad cuando existe.
  const timeValue = order.serviceTime
    ? formatTimeOnly(order.serviceTime)
    : order.billedAt
      ? formatTime(order.billedAt)
      : "";
  // Ciudad → ciudad del servicio; si no está definida, la del cliente; si tampoco, en blanco.
  const cityValue = order.serviceCity ?? client.city ?? "";
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
    <div className="mx-auto w-full max-w-[210mm] bg-white p-6 text-neutral-900 sm:p-10 print:w-full print:max-w-none print:p-0">
      {/* Pie repetido en cada hoja vía PrintDocumentFrame (tfoot). Sin
          numeración de página real: Chrome no soporta las cajas de margen
          de @page (counter(page)/counter(pages)) al imprimir vía
          window.print() — la única numeración que ofrece es el
          "Encabezados y pies de página" nativo del diálogo de impresión,
          que este proyecto pide desactivar (ver @page en globals.css)
          porque se superpondría con este mismo pie. */}
      <PrintDocumentFrame
        footer={
          footerText ? (
            <p className="pt-2 text-center text-[10px]" style={{ color: accentColor }}>
              {footerText}
            </p>
          ) : null
        }
      >
        <div className="flex flex-col gap-5">
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

          {/* Registro fotográfico: después del contenido, antes de las firmas —
              respalda lo descrito y precede a quien firma. Ausente por completo
              (ni la franja) si el cliente desactivó las fotos o la orden no
              tiene ninguna. */}
          {showPhotos && (
            <PhotosSection label={photosLabel} photos={photos} accentColor={accentColor} />
          )}

          {/* 4. Bloque de firmas */}
          <div className="mt-4 grid grid-cols-1 gap-10 break-inside-avoid sm:grid-cols-2">
            <SignatureColumn
              title="ENTREGA"
              companyValue={client.reportFormatIssuer ?? ""}
            />
            <SignatureColumn title="RECIBE" companyValue="" />
          </div>
        </div>
      </PrintDocumentFrame>
    </div>
  );
}

export function clientReportFormatFileTitle(order: WorkOrder): string {
  return `${formatOrderNumber(order.orderNumber)} - ${order.client.name}`;
}
