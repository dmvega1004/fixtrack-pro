import type { WorkOrder, WorkOrderEquipment } from "@/lib/api/work-orders";
import type { Client } from "@/lib/api/clients";
import type { Company } from "@/lib/api/company";
import type { Attachment } from "@/lib/api/attachments";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/document-type";
import { ORDER_STATUS_LABELS } from "@/components/shared/status-chip";
import { PRIORITY_LABELS } from "@/components/shared/priority-badge";
import { SERVICE_TYPE_LABELS } from "@/components/shared/service-type-badge";
import { formatQuoteNumber } from "@/lib/format/quote-number";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate, formatTime, formatTimeOnly } from "@/lib/format/dates";
import { formatDateOnly } from "@/lib/format/date-only";
import { cn } from "@/lib/utils";
import { SignatureLine } from "@/components/shared/signature-line";
import { PrintDocumentFrame } from "@/components/shared/print-document-frame";
import { PrintKeepTogether } from "@/components/shared/print-keep-together";
import { PrintPhotoGrid } from "@/components/shared/print-photo-grid";
import { QrCodeImage } from "@/components/equipment/qr-code-image";
import { PrintLetterhead } from "./print-letterhead";
import { PrintDocumentControlBox } from "@/components/shared/print-document-control-box";
import { resolveAccentColor, getAccentTextColor } from "@/lib/print/accent-color";
import { buildPrintFooter } from "@/lib/print/footer";
import {
  HEADER_FIELD_LABELS,
  type OptionalHeaderFieldKey,
} from "@/lib/work-order-header-fields";
import type { WorkOrderSection } from "@/lib/work-order-sections";
import type { ReportFormatSource } from "@/lib/report-format";

/** Mismo criterio que ReportSection en client-report-format-document.tsx: altura mínima de una sección vacía, suficiente para escribir a mano. */
const EMPTY_SECTION_MIN_HEIGHT = "42mm";

interface WorkOrderPrintDocumentProps {
  order: WorkOrder;
  /** Vacío en órdenes de servicio locativo — el bloque "Equipo(s)" se omite. */
  equipments: WorkOrderEquipment[];
  client: Client;
  company: Company;
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

function SectionTitle({
  children,
  accentColor,
  filled,
}: {
  children: string;
  accentColor: string;
  /** true = franja rellena con texto de contraste (Company.letterheadSectionTitleStyle === "FILLED"). false = el de hoy: texto en color + línea debajo. */
  filled: boolean;
}) {
  if (filled) {
    return (
      <h2
        className="print-color-exact break-after-avoid px-3 py-1.5 text-xs font-semibold tracking-wide uppercase"
        style={{ backgroundColor: accentColor, color: getAccentTextColor(accentColor) }}
      >
        {children}
      </h2>
    );
  }
  return (
    <h2
      className="break-after-avoid border-b border-neutral-200 pb-1 text-xs font-semibold tracking-wide uppercase"
      style={{ color: accentColor }}
    >
      {children}
    </h2>
  );
}

/**
 * Sección de contenido genérica — título en el estilo elegido (SectionTitle)
 * + texto plano debajo, sin recuadro de color. Reemplaza los recuadros
 * semánticos (amber/blue/green) cuando la empresa tiene membrete
 * configurado (ver hasLetterheadStyling) y es el único renderizado para
 * las secciones configurables (letterheadWorkOrderSections). Reserva
 * altura mínima cuando el contenido está vacío (ej. sección "en blanco",
 * o una fuente sin capturar todavía) — mismo criterio y mismo valor que
 * ReportSection en client-report-format-document.tsx, para que quede
 * espacio real para escribir a mano sin romper la paginación.
 */
function ContentSection({
  label,
  content,
  accentColor,
  filled,
  className,
}: {
  label: string;
  content: string;
  accentColor: string;
  filled: boolean;
  className?: string;
}) {
  const isEmpty = content.trim() === "";
  return (
    <section className={cn("break-inside-avoid", className)}>
      <SectionTitle accentColor={accentColor} filled={filled}>
        {label || " "}
      </SectionTitle>
      {filled ? (
        <div
          className="border border-t-0 border-neutral-300 p-3 text-sm whitespace-pre-wrap text-neutral-900"
          style={isEmpty ? { minHeight: EMPTY_SECTION_MIN_HEIGHT } : undefined}
        >
          {content}
        </div>
      ) : (
        <div
          className="mt-2 text-sm whitespace-pre-wrap text-neutral-900"
          style={isEmpty ? { minHeight: EMPTY_SECTION_MIN_HEIGHT } : undefined}
        >
          {content}
        </div>
      )}
    </section>
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

function SignatureBox({
  title,
  signatureImageUrl,
  name,
  document,
  role,
  company,
}: {
  title: string;
  /** Firma PERSONAL capturada en sitio (Módulo de Firmas) — técnico o quien recibe. */
  signatureImageUrl?: string | null;
  name?: string | null;
  document?: string | null;
  /** Cargo: technicianRole (congelado del rol) o receiverRole (texto libre). */
  role?: string | null;
  /** Solo el lado de quien recibe la trae (receiverCompany) — el técnico no tiene "empresa" en este documento, ya lleva el membrete de la propia. */
  company?: string | null;
}) {
  return (
    <div className="flex flex-col gap-8">
      <SignatureLine signatureImageUrl={signatureImageUrl} widthMm={40} heightMm={18} />
      <div className="flex flex-col gap-3 text-xs text-neutral-600">
        <span className="font-medium text-neutral-800">{title}</span>
        <span>Nombre: {name || "____________________________"}</span>
        <span>Documento: {document || "____________________________"}</span>
        <span>Cargo: {role || "____________________________"}</span>
        {company !== undefined && (
          <span>Empresa: {company || "____________________________"}</span>
        )}
      </div>
    </div>
  );
}

export function WorkOrderPrintDocument({
  order,
  equipments,
  client,
  company,
  photos,
}: WorkOrderPrintDocumentProps) {
  const documentLabel =
    client.documentType && client.documentNumber
      ? `${DOCUMENT_TYPE_LABELS[client.documentType as DocumentType] ?? client.documentType} ${client.documentNumber}`
      : null;

  const clientMeta = documentLabel ? `${client.name} · ${documentLabel}` : client.name;

  const accentColor = resolveAccentColor(company.letterheadAccentColor);
  const footer = buildPrintFooter(company);
  const sectionTitleFilled = company.letterheadSectionTitleStyle === "FILLED";

  // Defecto corregido: los recuadros semánticos (amber/blue/green) de
  // diagnóstico/observaciones/sugerencias no se enteraban del membrete —
  // al lado de franjas del color de acento, parecían de otro documento.
  // Con CUALQUIER señal de que la empresa personalizó el membrete (color
  // propio, o el estilo de franja rellena — las dos señales del reporte
  // original), esos 3 bloques por defecto se pintan como cualquier otra
  // sección (ContentSection), sin recuadro de color. Sin ninguna señal,
  // se mantienen los recuadros de colores de siempre — sin cambios.
  const hasLetterheadStyling = Boolean(company.letterheadAccentColor) || sectionTitleFilled;

  // Secciones de contenido configurables — sustituyen los 4 rótulos fijos
  // de antes. [] (sin configurar) usa el bloque original de siempre, sin
  // tocar: Servicio realizado con Descripción adentro, y los 3 recuadros
  // (o secciones planas si hasLetterheadStyling) de diagnóstico/
  // observaciones/sugerencias, cada uno solo si la orden tiene ese dato.
  // Configurado, TODAS las secciones del arreglo se pintan, en su orden,
  // aunque el campo de origen esté vacío — reserva el espacio para
  // llenarlo a mano (ver ContentSection/EMPTY_SECTION_MIN_HEIGHT), mismo
  // criterio que el formato de cliente con su fuente EMPTY.
  const sections = company.letterheadWorkOrderSections;
  const useCustomSections = sections.length > 0;

  function sectionContent(source: ReportFormatSource): string {
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

  // Encabezado configurable: [] (sin configurar) usa el bloque original
  // de siempre, sin tocar — ver más abajo. Configurado, se pinta EN EL
  // ORDEN del arreglo (la empresa lo controla desde el panel), cada campo
  // se omite si no tiene valor (ej. NIT sin documento registrado, hora
  // sin capturar) — nunca un campo vacío o "N/A".
  const headerFields = company.letterheadWorkOrderHeaderFields;
  const useCustomHeader = headerFields.length > 0;

  function getHeaderFieldValue(key: OptionalHeaderFieldKey): string | null {
    switch (key) {
      case "CLIENT":
        return client.name;
      case "TAX_ID":
        return documentLabel;
      case "STATUS":
        return ORDER_STATUS_LABELS[order.status];
      case "SERVICE_TYPE":
        return SERVICE_TYPE_LABELS[order.serviceType];
      case "PHONE":
        return client.phone;
      case "EMAIL":
        return client.email;
      case "ADDRESS":
        return client.address;
      case "SERVICE_CITY":
        return order.serviceCity ?? client.city;
      case "SERVICE_DATE":
        return order.serviceDate ? formatDateOnly(order.serviceDate) : null;
      case "SERVICE_TIME":
        return order.serviceTime
          ? formatTimeOnly(order.serviceTime)
          : order.billedAt
            ? formatTime(order.billedAt)
            : null;
      case "END_CLIENT":
        return order.endClientName;
      case "TECHNICIAN":
        return order.user?.name ?? null;
    }
  }

  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-6 text-neutral-900 sm:p-10 print:w-full print:max-w-none print:p-0">
      <PrintDocumentFrame
        footer={
          footer.text ? (
            <p
              className="pt-2 text-center text-[10px]"
              style={{ color: footer.useAccentColor ? accentColor : "#A3A3A3" }}
            >
              {footer.text}
            </p>
          ) : null
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PrintLetterhead company={company} accentColor={accentColor} />
          <PrintDocumentControlBox
            code={company.letterheadWorkOrderDocCode}
            version={company.letterheadWorkOrderDocVersion}
            date={company.letterheadWorkOrderDocDate}
          />
        </div>

        <hr className="mt-4 border-t-4" style={{ borderColor: accentColor }} />

        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 break-inside-avoid print:bg-transparent">
          {/* "Documento" y "Fecha" identifican el documento — se pintan
              siempre primero, sin poder apagarse, configurado o no. */}
          <MetaItem
            label="Documento"
            value={`Orden de trabajo ${formatOrderNumber(order.orderNumber)}`}
          />
          {/* Fecha de servicio (cuándo se hizo el trabajo) si existe; si no,
              la de creación, exactamente como hoy — createdAt (hecho de
              auditoría) nunca se edita, así que solo cambia la ETIQUETA
              cuando hay una fecha de servicio real que mostrar en su lugar. */}
          <MetaItem
            label={order.serviceDate ? "Fecha de servicio" : "Fecha"}
            value={
              order.serviceDate
                ? formatDateOnly(order.serviceDate)
                : formatDate(order.createdAt)
            }
          />
          {/* Cotización que la orden ejecuta, junto a número y fecha. Mismo
              MetaItem que los demás campos del encabezado: hereda el
              formato de la plantilla de la empresa (membrete o no), sin
              colores propios. Sin enlace, la fila no aparece. */}
          {order.quote && (
            <MetaItem
              label="Ejecuta cotización"
              value={formatQuoteNumber(order.quote.quoteNumber)}
            />
          )}
          {useCustomHeader ? (
            // Configurado: EN EL ORDEN del arreglo — la empresa lo
            // controla desde el panel (checklist + mover arriba/abajo).
            // Campo sin valor (ej. NIT sin documento, hora sin capturar)
            // se omite en silencio, nunca "N/A".
            headerFields.map((key) => {
              const value = getHeaderFieldValue(key as OptionalHeaderFieldKey);
              if (!value) return null;
              return (
                <MetaItem
                  key={key}
                  label={HEADER_FIELD_LABELS[key as OptionalHeaderFieldKey]}
                  value={value}
                />
              );
            })
          ) : (
            // Sin configurar: el bloque original de siempre, intacto —
            // Cliente combinado con NIT en un solo valor (clientMeta),
            // distinto del renderizado campo-por-campo de arriba.
            <>
              <MetaItem label="Cliente" value={clientMeta} />
              <MetaItem label="Estado" value={ORDER_STATUS_LABELS[order.status]} />
              <MetaItem
                label="Tipo de servicio"
                value={SERVICE_TYPE_LABELS[order.serviceType]}
              />
              {/* Contacto del cliente, solo cuando existe — antes vivía en su
                  propia sección "Datos del cliente", duplicando nombre/documento
                  que ya están arriba en "Cliente". Se fusiona acá para que el
                  cliente aparezca una sola vez en todo el documento. */}
              {client.phone && <MetaItem label="Teléfono" value={client.phone} />}
              {client.email && <MetaItem label="Correo" value={client.email} />}
              {client.address && <MetaItem label="Dirección" value={client.address} />}
            </>
          )}
        </div>

        {equipments.length === 1 && (
          <section className="mt-6 flex flex-col gap-3">
            <SectionTitle accentColor={accentColor} filled={sectionTitleFilled}>Equipo</SectionTitle>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <Field label="Marca" value={equipments[0].brand} />
              <Field label="Modelo" value={equipments[0].model} />
              <Field label="Serial" value={equipments[0].serialNumber} />
              <Field label="Ubicación" value={equipments[0].location} />
              {/* QR real en vez del identificador crudo — nadie puede hacer
                  nada con un UUID impreso como texto. Discreto a propósito
                  (56px): es un complemento para escanear, no el
                  protagonista del bloque. Sin qrCode, se omite el campo
                  entero — nunca cae de vuelta al identificador crudo. */}
              {equipments[0].qrCode && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                    Código QR
                  </span>
                  <QrCodeImage value={equipments[0].qrCode} size={56} />
                </div>
              )}
            </div>
          </section>
        )}

        {equipments.length > 1 && (
          <section className="mt-6 flex flex-col gap-3">
            <SectionTitle accentColor={accentColor} filled={sectionTitleFilled}>{`Equipos (${equipments.length})`}</SectionTitle>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="break-after-avoid border-b border-neutral-400 text-left text-[11px] tracking-wide text-neutral-500 uppercase">
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
          <SectionTitle accentColor={accentColor} filled={sectionTitleFilled}>Servicio realizado</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Técnico asignado" value={order.user?.name ?? null} />
            <Field label="Prioridad" value={PRIORITY_LABELS[order.priority]} />
          </div>
          {/* Sin secciones configuradas, la descripción vive acá adentro,
              intacta — configurada, es una sección más de la lista
              (abajo), en la posición que la empresa eligió. */}
          {!useCustomSections && <Field label="Descripción" value={order.description} />}
        </section>

        {useCustomSections ? (
          // Configurado: TODAS las secciones del arreglo, en orden —
          // nunca un recuadro de color, siempre ContentSection.
          sections.map((section: WorkOrderSection, index: number) => (
            <ContentSection
              key={index}
              label={section.label}
              content={sectionContent(section.source)}
              accentColor={accentColor}
              filled={sectionTitleFilled}
              className="mt-4"
            />
          ))
        ) : hasLetterheadStyling ? (
          // Membrete configurado (color o franja) pero sin secciones
          // propias todavía: los 3 bloques de siempre, con sus rótulos de
          // siempre, pero como sección plana — ya no como recuadro de
          // color ajeno al membrete. Misma condición de siempre (solo si
          // la orden tiene ese dato).
          <>
            {order.diagnosis && (
              <ContentSection
                label="Hallazgo técnico / Diagnóstico"
                content={order.diagnosis}
                accentColor={accentColor}
                filled={sectionTitleFilled}
                className="mt-4"
              />
            )}
            {order.observations && (
              <ContentSection
                label="Observaciones y recomendaciones"
                content={order.observations}
                accentColor={accentColor}
                filled={sectionTitleFilled}
                className="mt-4"
              />
            )}
            {order.suggestions && (
              <ContentSection
                label="Sugerencias y recomendaciones"
                content={order.suggestions}
                accentColor={accentColor}
                filled={sectionTitleFilled}
                className="mt-4"
              />
            )}
          </>
        ) : (
          // Sin membrete configurado: el bloque original de siempre,
          // intacto — recuadros de colores semánticos.
          <>
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
          </>
        )}

        {/* Salto de página antes del registro fotográfico: el texto del
            servicio ocupa las hojas anteriores completas y las fotos
            empiezan limpias en la siguiente, con su franja de título
            arriba — sin huecos de media hoja. Solo se aplica cuando hay
            fotos (este bloque no se renderiza en absoluto si no las hay),
            así que nunca deja una hoja en blanco. */}
        {photos.length > 0 && (
          <section className="mt-6 flex flex-col gap-3 break-before-page">
            <SectionTitle accentColor={accentColor} filled={sectionTitleFilled}>Archivo fotográfico</SectionTitle>
            <PrintPhotoGrid photos={photos} />
          </section>
        )}

        {/* Fila de tabla propia (ver PrintKeepTogether): así el bloque
            entero de firmas se mueve completo a la hoja siguiente si no
            cabe, nunca partido entre las rúbricas y sus datos. pt-16/pb-10
            son padding, no margin, en el <td> — ese espacio no se pierde
            si el bloque termina abriendo hoja nueva. */}
        <PrintKeepTogether className="pt-16 pb-10">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            <SignatureBox
              title="Técnico responsable"
              signatureImageUrl={order.technicianSignatureUrl}
              name={order.technicianName}
              document={order.technicianDocument}
              role={order.technicianRole}
            />
            <SignatureBox
              title="Recibido por el cliente"
              signatureImageUrl={order.receiverSignatureUrl}
              name={order.receiverName}
              document={order.receiverDocument}
              role={order.receiverRole}
              company={order.receiverCompany}
            />
          </div>
        </PrintKeepTogether>
      </PrintDocumentFrame>
    </div>
  );
}
