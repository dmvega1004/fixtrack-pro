import { WifiOff } from "lucide-react";
import { StatusChip } from "@/components/shared/status-chip";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { ServiceTypeBadge } from "@/components/shared/service-type-badge";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate } from "@/lib/format/dates";
import { formatCurrency } from "@/lib/format/currency";
import type { SyncWorkOrder } from "@/lib/sync/types";
import { OfflinePhotoPlaceholder } from "./offline-photo-placeholder";

interface OrderDetailOfflineProps {
  order: SyncWorkOrder;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{value}</p>
    </div>
  );
}

/**
 * Vista de solo lectura del detalle de una orden, armada desde el
 * conjunto de trabajo guardado (lib/sync) — NO son los mismos componentes
 * de la vista con conexión (DetailsTab/PartsTab/PhotosTab y sus
 * editores): esos traen decenas de acciones de escritura entreveradas
 * con la lectura (cambiar estado, editar, firmar, agregar fotos y
 * repuestos, imprimir, generar la cuenta de cobro...), y el conjunto de
 * trabajo guardado tampoco trae todos los datos que esas pantallas usan
 * (ficha completa del cliente, catálogo de técnicos/repuestos, historial,
 * pagos). Reconstruirlas para que se vieran "iguales pero grises" habría
 * significado tocar ~20 archivos y confiar en no olvidar ninguno.
 *
 * Esta vista, en cambio, es nueva y deliberadamente angosta: no tiene NI
 * UN control de escritura, así que no hay nada que pueda "fallar en
 * silencio" — no por estar deshabilitado, sino porque no existe.
 */
export function OrderDetailOffline({ order }: OrderDetailOfflineProps) {
  const hasFinancials = order.parts.billing !== undefined && order.parts.totalSale !== undefined;
  const serviceInfo = [
    order.endClientName && { label: "Cliente final", value: order.endClientName },
    order.serviceCity && { label: "Ciudad del servicio", value: order.serviceCity },
    order.serviceTime && { label: "Hora del servicio", value: order.serviceTime },
  ].filter((field): field is { label: string; value: string } => Boolean(field));

  return (
    <div className="flex flex-1 flex-col pb-6">
      <div className="flex flex-col gap-3 border-b border-border p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold md:text-3xl">
            {formatOrderNumber(order.orderNumber)}
          </h1>
          <StatusChip status={order.status} />
          <PriorityBadge priority={order.priority} />
          <ServiceTypeBadge serviceType={order.serviceType} />
        </div>
        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
        <p className="text-sm">{order.description}</p>

        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 text-sm">
          <span className="font-medium">{order.client.name}</span>
          {order.equipments.length === 0 ? (
            <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Servicio locativo
            </span>
          ) : (
            order.equipments.map((equipment) => (
              <span key={equipment.id} className="text-muted-foreground">
                {equipment.brand} {equipment.model}
                {equipment.location ? ` · ${equipment.location}` : ""}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 border-b border-border bg-amber-50 p-4 text-sm text-amber-900 md:mx-6 md:mt-4 md:rounded-lg md:border">
        <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Sin conexión: estás viendo lo que quedó guardado en este celular,
          en modo solo lectura. No puedes cambiar el estado, editar campos,
          agregar o borrar fotos, agregar repuestos, firmar, imprimir, ni
          generar la cuenta de cobro hasta que vuelva la señal. Vas a poder
          registrar estos cambios sin conexión en una próxima versión.
        </p>
      </div>

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Field
          label="Diagnóstico"
          value={order.diagnosis || "Sin diagnóstico registrado"}
        />
        <Field
          label="Observaciones"
          value={order.observations || "Sin observaciones registradas"}
        />
        {order.suggestions && <Field label="Recomendaciones" value={order.suggestions} />}

        {serviceInfo.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {serviceInfo.map((field) => (
              <Field key={field.label} label={field.label} value={field.value} />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Firmas</h3>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Técnico
              </span>
              <p className="mt-1">
                {order.technicianSignatureUrl ? order.technicianName : "Sin firmar"}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Quien recibe
              </span>
              <p className="mt-1">
                {order.receiverSignatureUrl ? order.receiverName : "Sin firmar"}
              </p>
            </div>
          </div>
          {(order.technicianSignatureUrl || order.receiverSignatureUrl) && (
            <p className="text-xs text-muted-foreground">
              Las imágenes de las firmas no están disponibles sin conexión.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Repuestos</h3>
          {order.parts.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin repuestos registrados.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {order.parts.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.sparePart.name}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU {item.sparePart.sku} · Cantidad {item.quantity}
                    </p>
                  </div>
                  {item.unitPrice !== undefined && (
                    <span>{formatCurrency(Number(item.unitPrice) * item.quantity)}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {hasFinancials && order.parts.billing && (
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal repuestos</span>
                <span className="font-semibold">
                  {formatCurrency(order.parts.totalSale!)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mano de obra</span>
                <span>{formatCurrency(order.parts.billing.laborAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.parts.billing.total)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">
            Fotos{order.photos.length > 0 && ` (${order.photos.length})`}
          </h3>
          {order.photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin fotos registradas.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {order.photos.map((photo) => (
                <OfflinePhotoPlaceholder key={photo.id} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          El historial de esta orden no está disponible sin conexión.
        </div>
      </div>
    </div>
  );
}
