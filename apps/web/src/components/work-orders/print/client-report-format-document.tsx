import type { WorkOrder } from "@/lib/api/work-orders";
import type { Client, ReportFormatSource } from "@/lib/api/clients";
import type { Attachment } from "@/lib/api/attachments";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate, formatTime, formatTimeOnly } from "@/lib/format/dates";
import { cn } from "@/lib/utils";
import { PrintDocumentFrame } from "@/components/shared/print-document-frame";
import { PrintKeepTogether } from "@/components/shared/print-keep-together";
import { PrintPhotoGrid } from "@/components/shared/print-photo-grid";
import { SignatureLine } from "@/components/shared/signature-line";

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
  className,
}: {
  label: string;
  content: string;
  accentColor: string;
  className?: string;
}) {
  const isEmpty = content.trim() === "";

  return (
    // Flujo de bloque normal, no flex: la franja de título y su contenido
    // deben sobrevivir juntos a un salto de hoja (break-inside-avoid), y
    // Chrome ignora esa instrucción en los hijos de un contenedor flex al
    // imprimir — ver el comentario en ClientReportFormatDocument.
    <section className={cn("break-inside-avoid", className)}>
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
  className,
}: {
  label: string;
  photos: Attachment[];
  accentColor: string;
  className?: string;
}) {
  // Flujo de bloque normal, no flex: la franja de título y la cuadrícula de
  // fotos son hijos directos de este <section>, y un contenedor flex les
  // impide fragmentar de forma fiable — mismo motivo que ReportSection.
  return (
    <section className={cn("break-before-page", className)}>
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
  signatureImageUrl,
  name,
  document,
  role,
}: {
  title: string;
  companyValue: string;
  /** Firma PERSONAL capturada en sitio (Módulo de Firmas) — técnico o quien recibe. */
  signatureImageUrl?: string | null;
  name?: string | null;
  document?: string | null;
  /** Cargo: technicianRole (congelado del rol) del lado ENTREGA, receiverRole (texto libre) del lado RECIBE. */
  role?: string | null;
}) {
  // Flujo de bloque normal, no flex: aunque esta columna vive dentro de la
  // fila de tabla atómica de PrintKeepTogether (que ya garantiza que todo
  // el bloque de firmas viaja junto), un flex-col acá adentro es la misma
  // trampa que en el resto del documento — el margen reemplaza al gap.
  return (
    <div>
      <SignatureLine signatureImageUrl={signatureImageUrl} widthMm={40} heightMm={18} />
      <div className="mt-8 text-xs text-neutral-700">
        <span className="block text-sm font-semibold text-neutral-900">{title}</span>
        <span className="mt-2 block">Nombre: {name || "____________________________"}</span>
        <span className="mt-2 block">
          Documento: {document || "____________________________"}
        </span>
        <span className="mt-2 block">Cargo: {role || "____________________________"}</span>
        <span className="mt-2 block">
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
        {/* Flujo de bloque normal, NO flex: Chrome no fragmenta de forma
            fiable el contenido de un contenedor flexible al imprimir —
            ignora break-inside-avoid en los hijos de un flex, así que
            hasta las filas de PrintKeepTogether bien construidas se
            partían entre hojas por estar anidadas acá adentro. El
            espaciado entre secciones pasa de gap (flex) a margen (mt-*)
            entre hermanos — ver el mismo criterio en work-order-print-
            document.tsx y collection-document.tsx, que nunca tuvieron
            este envoltorio y por eso no fallan. */}
        <div>
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
          <div className="mt-5 break-inside-avoid">
            <div className="grid grid-cols-2 gap-2">
              <DataCell label="Fecha" value={dateValue} accentColor={accentColor} />
              <DataCell label="Ciudad" value={cityValue} accentColor={accentColor} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <DataCell label="Cliente" value={endClientValue} accentColor={accentColor} />
              <DataCell label="Hora" value={timeValue} accentColor={accentColor} />
            </div>
          </div>

          {/* 3. Las tres secciones */}
          <div className="mt-5">
            {sections.map((section, index) => (
              <ReportSection
                key={index}
                label={section.label}
                content={section.content}
                accentColor={accentColor}
                className={index > 0 ? "mt-4" : undefined}
              />
            ))}
          </div>

          {/* Registro fotográfico: después del contenido, antes de las firmas —
              respalda lo descrito y precede a quien firma. Ausente por completo
              (ni la franja) si el cliente desactivó las fotos o la orden no
              tiene ninguna. */}
          {showPhotos && (
            <PhotosSection
              label={photosLabel}
              photos={photos}
              accentColor={accentColor}
              className="mt-5"
            />
          )}

          {/* 4. Bloque de firmas: fila de tabla propia (ver
              PrintKeepTogether) — no se parte entre hojas, y el pt-16/pb-10
              (padding, no margin) sobrevive aunque el bloque abra hoja
              nueva, a diferencia de un margin. */}
          <PrintKeepTogether className="pt-16 pb-10">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
              <SignatureColumn
                title="ENTREGA"
                companyValue={client.reportFormatIssuer ?? ""}
                signatureImageUrl={order.technicianSignatureUrl}
                name={order.technicianName}
                document={order.technicianDocument}
                role={order.technicianRole}
              />
              <SignatureColumn
                title="RECIBE"
                companyValue={order.receiverCompany ?? ""}
                signatureImageUrl={order.receiverSignatureUrl}
                name={order.receiverName}
                document={order.receiverDocument}
                role={order.receiverRole}
              />
            </div>
          </PrintKeepTogether>
        </div>
      </PrintDocumentFrame>
    </div>
  );
}

export function clientReportFormatFileTitle(order: WorkOrder): string {
  return `${formatOrderNumber(order.orderNumber)} - ${order.client.name}`;
}
