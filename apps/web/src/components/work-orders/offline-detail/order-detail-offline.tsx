"use client";

import { Printer, WifiOff } from "lucide-react";
import { StatusChip } from "@/components/shared/status-chip";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { ServiceTypeBadge } from "@/components/shared/service-type-badge";
import { Button } from "@/components/ui/button";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate } from "@/lib/format/dates";
import { formatCurrency } from "@/lib/format/currency";
import { isTerminalStatus } from "@/lib/dashboard/summary";
import type { SyncWorkOrder } from "@/lib/sync/types";
import { DescriptionEditor } from "../description-editor";
import { DiagnosisEditor } from "../diagnosis-editor";
import { ObservationsEditor } from "../observations-editor";
import { SuggestionsEditor } from "../suggestions-editor";
import { OrderStatusChanger } from "../order-status-changer";
import { OrderTabs } from "../order-tabs";
import { OfflineDisabledNotice } from "./offline-disabled-notice";
import { OfflinePhotoPlaceholder } from "./offline-photo-placeholder";

interface OrderDetailOfflineProps {
  order: SyncWorkOrder;
  userId: string;
  canManage: boolean;
  isAdmin: boolean;
}

/**
 * Pantalla real de detalle de orden sin conexión (Etapa 2-C) — reemplaza
 * la vista angosta de solo lectura de la Etapa 1-C-3. Armada desde el
 * conjunto de trabajo guardado CON los cambios pendientes de subir
 * aplicados encima (ver useSyncedOrder, que es quien resuelve esa mezcla
 * para toda la aplicación).
 *
 * A diferencia de la vista anterior, esta SÍ reutiliza los componentes de
 * escritura reales para los cinco campos habilitados sin conexión
 * (Descripción, Diagnóstico, Observaciones, Recomendaciones y el cambio de
 * estado) — son los mismos que usa la pantalla con conexión, ahora
 * también offline-aware (cada uno decide solo, con useOnlineStatus, si
 * llama su Server Action de siempre o encola). Todo lo demás (fotos,
 * firma, repuestos, valores, imprimir, cuenta de cobro, eliminar, y los
 * bloques admin-only de reasignar/prioridad/tipo de servicio/ubicación del
 * servicio) se muestra desactivado con su motivo — ver
 * OfflineDisabledNotice — nunca como si funcionara.
 */
export function OrderDetailOffline({
  order,
  userId,
  canManage,
  isAdmin,
}: OrderDetailOfflineProps) {
  const isTerminal = isTerminalStatus(order.status);
  const isClosed = order.status === "COMPLETED" || order.status === "DELIVERED";
  const hasFinancials = order.parts.billing !== undefined && order.parts.totalSale !== undefined;

  return (
    <div className="flex flex-1 flex-col pb-36 md:pb-6">
      <div className="flex flex-col gap-3 border-b border-border p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold md:text-3xl">
              {formatOrderNumber(order.orderNumber)}
            </h1>
            <StatusChip status={order.status} />
            <PriorityBadge priority={order.priority} />
            <ServiceTypeBadge serviceType={order.serviceType} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled title="Imprimir no está disponible sin conexión">
              <Printer className="size-4" />
              Imprimir orden
            </Button>
            {isAdmin && isClosed && (
              <Button variant="outline" size="sm" disabled title="La cuenta de cobro no está disponible sin conexión">
                Cuenta de cobro
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>

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
          Sin conexión: puedes editar descripción, diagnóstico,
          observaciones, recomendaciones y cambiar el estado — se guarda en
          este celular y sube solo cuando vuelva la señal. Fotos, firma,
          repuestos, valores, imprimir, cuenta de cobro y eliminar siguen
          desactivados hasta entonces.
        </p>
      </div>

      <OrderStatusChanger
        orderId={order.id}
        userId={userId}
        currentStatus={order.status}
        isTerminal={isTerminal}
      />

      <OrderTabs
        detalles={
          <div className="flex flex-col gap-6 p-4 md:p-6">
            <DescriptionEditor
              orderId={order.id}
              userId={userId}
              initialDescription={order.description}
              isTerminal={isTerminal}
            />

            <DiagnosisEditor
              orderId={order.id}
              userId={userId}
              initialDiagnosis={order.diagnosis}
              isTerminal={isTerminal}
            />

            <ObservationsEditor
              orderId={order.id}
              userId={userId}
              initialObservations={order.observations}
              isTerminal={isTerminal}
            />

            <SuggestionsEditor
              orderId={order.id}
              userId={userId}
              initialSuggestions={order.suggestions}
              isTerminal={isTerminal}
            />

            {(order.endClientName || order.serviceCity || order.serviceTime) && (
              <OfflineDisabledNotice label="Cliente final, ciudad y hora del servicio">
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                  {order.endClientName && (
                    <div>
                      <span className="text-xs text-muted-foreground">Cliente final</span>
                      <p>{order.endClientName}</p>
                    </div>
                  )}
                  {order.serviceCity && (
                    <div>
                      <span className="text-xs text-muted-foreground">Ciudad del servicio</span>
                      <p>{order.serviceCity}</p>
                    </div>
                  )}
                  {order.serviceTime && (
                    <div>
                      <span className="text-xs text-muted-foreground">Hora del servicio</span>
                      <p>{order.serviceTime}</p>
                    </div>
                  )}
                </div>
              </OfflineDisabledNotice>
            )}

            <OfflineDisabledNotice label="Firmas">
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
            </OfflineDisabledNotice>

            {canManage && (
              <>
                <OfflineDisabledNotice label={`Técnico asignado: ${order.user?.name ?? "sin asignar"}`} />
                <OfflineDisabledNotice label={`Prioridad: ${order.priority}`} />
                <OfflineDisabledNotice label={`Tipo de servicio: ${order.serviceType}`} />
              </>
            )}

            {isAdmin && (
              <div className="mt-2 border-t border-border pt-4">
                <OfflineDisabledNotice
                  label="Eliminar orden"
                  reason="Eliminar una orden no está disponible sin conexión."
                />
              </div>
            )}
          </div>
        }
        repuestos={
          <div className="flex flex-col gap-3 p-4 md:p-6">
            <OfflineDisabledNotice
              label="Repuestos y valores"
              reason="Solo lectura sin conexión: no puedes agregar ni quitar repuestos ni cambiar la valorización."
            >
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
                <div className="mt-3 flex flex-col gap-1 rounded-lg border border-border bg-muted/50 p-4 text-sm">
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
            </OfflineDisabledNotice>
          </div>
        }
        fotos={
          <div className="flex flex-col gap-3 p-4 md:p-6">
            <OfflineDisabledNotice
              label={`Fotos${order.photos.length > 0 ? ` (${order.photos.length})` : ""}`}
              reason="No puedes agregar ni eliminar fotos sin conexión."
            >
              {order.photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin fotos registradas.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {order.photos.map((photo) => (
                    <OfflinePhotoPlaceholder key={photo.id} />
                  ))}
                </div>
              )}
            </OfflineDisabledNotice>
          </div>
        }
        historial={
          <div className="p-4 md:p-6">
            <OfflineDisabledNotice
              label="Historial"
              reason="El historial de esta orden no está disponible sin conexión."
            />
          </div>
        }
      />
    </div>
  );
}
