import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, QrCode, Wrench } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getWorkOrders } from "@/lib/api/work-orders";
import { WorkOrderCard } from "@/components/work-orders/work-order-card";
import { StatusChip } from "@/components/shared/status-chip";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatEquipmentSummary } from "@/lib/format/equipment-summary";
import { formatDate } from "@/lib/format/dates";
import type { Session } from "@/lib/roles";
import {
  filterActiveOrders,
  filterByStatus,
  filterHighPriorityActive,
  countCompletedOrDeliveredInMonth,
  sortActiveOrdersByUrgency,
  staleActiveOrders,
  recentlyClosedOrders,
} from "@/lib/dashboard/summary";
import { KpiCard } from "./kpi-card";

function formatToday(): string {
  const formatted = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

interface TechnicianDashboardProps {
  session: Session;
}

const ACTIVE_ORDERS_PREVIEW_LIMIT = 5;
const RECENTLY_CLOSED_LIMIT = 5;
const STALE_THRESHOLD_DAYS = 5;

/**
 * Home del Técnico: pantalla operativa mobile-first, sin KPIs financieros
 * ni ranking de compañeros. El nombre viaja en el JWT (ver JwtPayload en el
 * backend), así que no hace falta GET /users/:id (ADMIN/COORDINATOR-only)
 * para saludar al técnico por su nombre.
 *
 * Todo lo demás se deriva de GET /work-orders, que el backend ya limita a
 * las órdenes asignadas al técnico — ningún cálculo aquí expone datos de
 * otros técnicos ni requiere cambios de backend.
 */
export async function TechnicianDashboard({ session }: TechnicianDashboardProps) {
  const workOrders = await getWorkOrders();

  const activeOrders = filterActiveOrders(workOrders);
  const highPriorityActive = filterHighPriorityActive(workOrders);
  const inProgress = filterByStatus(workOrders, "IN_PROGRESS");
  const completedThisMonth = countCompletedOrDeliveredInMonth(workOrders);
  const visibleActiveOrders = sortActiveOrdersByUrgency(workOrders).slice(
    0,
    ACTIVE_ORDERS_PREVIEW_LIMIT,
  );
  const stale = staleActiveOrders(workOrders, STALE_THRESHOLD_DAYS);
  const recentlyClosed = recentlyClosedOrders(workOrders, RECENTLY_CLOSED_LIMIT);

  return (
    <div className="flex flex-1 flex-col gap-5 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Hola, {session.name}</h1>
        <p className="text-sm text-muted-foreground">{formatToday()}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/escanear"
          className="flex items-center justify-center gap-2 rounded-xl bg-primary p-5 text-center text-primary-foreground shadow-sm transition-opacity active:opacity-90"
        >
          <QrCode className="size-6" />
          <span className="text-lg font-semibold">Escanear equipo</span>
        </Link>
        <Link
          href="/ordenes/nueva"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
        >
          Nueva orden
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard href="/ordenes" label="Asignadas" value={activeOrders.length} icon={ClipboardList} />
        <KpiCard
          href="/ordenes?priority=HIGH"
          label="Prioridad alta"
          value={highPriorityActive.length}
          icon={AlertTriangle}
          tone={highPriorityActive.length > 0 ? "danger" : "default"}
        />
        <KpiCard
          href="/ordenes?status=IN_PROGRESS"
          label="En reparación"
          value={inProgress.length}
          icon={Wrench}
        />
        <KpiCard
          label="Cerradas este mes"
          value={completedThisMonth}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      {stale.length > 0 && (
        <Link
          href={`/ordenes/${stale[0].order.id}`}
          className="flex flex-col gap-0.5 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3 dark:bg-amber-950/40"
        >
          <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {formatOrderNumber(stale[0].order.orderNumber)} lleva {stale[0].daysSinceUpdate} días
            sin actualizarse
          </span>
          {stale.length > 1 && (
            <span className="text-xs text-amber-700 dark:text-amber-300">
              y {stale.length - 1} {stale.length - 1 === 1 ? "orden más" : "órdenes más"}{" "}
              estancada{stale.length - 1 === 1 ? "" : "s"}
            </span>
          )}
        </Link>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mis órdenes activas</h2>
          {activeOrders.length > 0 && (
            <Link href="/ordenes" className="text-sm font-medium text-primary">
              Ver todas
            </Link>
          )}
        </div>

        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No tienes órdenes asignadas por ahora.
            </p>
            <Link href="/escanear" className="text-sm font-medium text-primary">
              Escanea un equipo para empezar →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleActiveOrders.map((order) => (
              <WorkOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Cerradas recientemente</h2>

        {recentlyClosed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no has cerrado ninguna orden.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {recentlyClosed.map((order) => (
              <Link
                key={order.id}
                href={`/ordenes/${order.id}`}
                className="flex items-center justify-between gap-3 p-3 text-sm transition-colors hover:bg-muted/50"
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="font-medium">{formatOrderNumber(order.orderNumber)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {formatEquipmentSummary(order.equipments)} · {order.client.name}
                  </span>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <StatusChip status={order.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(order.updatedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
