import type { WorkOrder, WorkOrderEquipment } from "@/lib/api/work-orders";
import type { Client } from "@/lib/api/clients";
import type { Company } from "@/lib/api/company";
import type { Attachment } from "@/lib/api/attachments";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/document-type";
import { ORDER_STATUS_LABELS } from "@/components/shared/status-chip";
import { PRIORITY_LABELS } from "@/components/shared/priority-badge";
import { SERVICE_TYPE_LABELS } from "@/components/shared/service-type-badge";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate } from "@/lib/format/dates";
import { cn } from "@/lib/utils";
import { SignatureLine } from "@/components/shared/signature-line";
import { PrintDocumentFrame } from "@/components/shared/print-document-frame";
import { PrintKeepTogether } from "@/components/shared/print-keep-together";
import { PrintPhotoGrid } from "@/components/shared/print-photo-grid";
import { QrCodeImage } from "@/components/equipment/qr-code-image";
import { PrintLetterhead, PRINT_BRAND_BLUE as BRAND_BLUE } from "./print-letterhead";

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

function SectionTitle({ children }: { children: string }) {
  return (
    <h2
      className="break-after-avoid border-b pb-1 text-xs font-semibold tracking-wide uppercase"
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

  // Pie fijo de cada hoja impresa: sitio web (o correo/teléfono si no hay)
  // + la atribución del producto. Nunca ambos vacíos: "Documento generado
  // por FixTrack Pro" siempre está presente.
  const footerContact = company.website || company.email || company.phone;
  const printFooterText = footerContact
    ? `${footerContact} · Documento generado por FixTrack Pro`
    : "Documento generado por FixTrack Pro";

  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-6 text-neutral-900 sm:p-10 print:w-full print:max-w-none print:p-0">
      <PrintDocumentFrame
        footer={
          <p className="pt-2 text-center text-[10px] text-neutral-400">
            {printFooterText}
          </p>
        }
      >
        <PrintLetterhead company={company} />

        <hr className="mt-4 border-t-4" style={{ borderColor: BRAND_BLUE }} />

        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 break-inside-avoid print:bg-transparent">
          <MetaItem
            label="Documento"
            value={`Orden de trabajo ${formatOrderNumber(order.orderNumber)}`}
          />
          <MetaItem label="Fecha" value={formatDate(order.createdAt)} />
          <MetaItem label="Cliente" value={clientMeta} />
          <MetaItem label="Estado" value={ORDER_STATUS_LABELS[order.status]} />
          <MetaItem label="Tipo de servicio" value={SERVICE_TYPE_LABELS[order.serviceType]} />
          {/* Contacto del cliente, solo cuando existe — antes vivía en su
              propia sección "Datos del cliente", duplicando nombre/documento
              que ya están arriba en "Cliente". Se fusiona acá para que el
              cliente aparezca una sola vez en todo el documento. */}
          {client.phone && <MetaItem label="Teléfono" value={client.phone} />}
          {client.email && <MetaItem label="Correo" value={client.email} />}
          {client.address && <MetaItem label="Dirección" value={client.address} />}
        </div>

        {equipments.length === 1 && (
          <section className="mt-6 flex flex-col gap-3">
            <SectionTitle>Equipo</SectionTitle>
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
            <SectionTitle>{`Equipos (${equipments.length})`}</SectionTitle>
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

        {/* Salto de página antes del registro fotográfico: el texto del
            servicio ocupa las hojas anteriores completas y las fotos
            empiezan limpias en la siguiente, con su franja de título
            arriba — sin huecos de media hoja. Solo se aplica cuando hay
            fotos (este bloque no se renderiza en absoluto si no las hay),
            así que nunca deja una hoja en blanco. */}
        {photos.length > 0 && (
          <section className="mt-6 flex flex-col gap-3 break-before-page">
            <SectionTitle>Archivo fotográfico</SectionTitle>
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
