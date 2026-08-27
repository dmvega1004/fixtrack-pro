import { Suspense } from "react";
import Link from "next/link";
import { ClipboardList, UserRoundX, PackageX, PhoneCall, Wallet, Wrench } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCompany } from "@/lib/api/company";
import { getWorkOrderStats } from "@/lib/api/work-orders";
import { getSpareParts } from "@/lib/api/spare-parts";
import { getBillingSummary } from "@/lib/api/billing";
import { formatCurrency } from "@/lib/format/currency";
import type { Session } from "@/lib/roles";
import { lowStockAlerts } from "@/lib/dashboard/summary";
import { KpiCard } from "./kpi-card";
import { TechnicianPerformancePanel } from "./technician-performance-panel";
import { OrdersByStatusPanel } from "./orders-by-status-panel";
import { RecentOrdersPanel } from "./recent-orders-panel";
import { InventoryAlertsPanel } from "./inventory-alerts-panel";

function formatToday(): string {
  const formatted = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

interface AdminDashboardProps {
  session: Session;
}

/**
 * Stock bajo (KPI) y alertas de inventario comparten la misma consulta
 * (GET /spare-parts?lowStock=true) pero viven en dos zonas distintas del
 * layout (fila de KPIs vs. grilla de paneles) — Next dedupea el fetch por
 * request, así que llamarla desde dos componentes async no duplica la
 * petición al backend, y cada uno puede aparecer en su Suspense propio.
 */
async function InventoryKpi() {
  const lowStockParts = await getSpareParts({ lowStock: true });
  return (
    <KpiCard
      href="/inventario?lowStock=true"
      label="Stock bajo"
      value={lowStockParts.length}
      icon={PackageX}
      tone={lowStockParts.length > 0 ? "danger" : "default"}
    />
  );
}

async function InventoryAlerts() {
  const lowStockParts = await getSpareParts({ lowStock: true });
  const alerts = lowStockAlerts(lowStockParts, 5);
  return <InventoryAlertsPanel items={alerts} />;
}

interface BillingCardProps {
  currency: string;
}

/** SOLO ADMIN (GET /billing/summary es 403 para Coordinador) — el llamador ya filtra por rol. */
async function BillingCard({ currency }: BillingCardProps) {
  const billingSummary = await getBillingSummary();

  return (
    <Link
      href="/cobros"
      className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Por cobrar
        </span>
        <Wallet className="size-4 shrink-0 text-amber-600" />
      </div>
      <span className="min-w-0 text-lg font-semibold tabular-nums text-amber-600 sm:text-xl md:text-2xl">
        {formatCurrency(billingSummary.totalReceivable, currency)}
      </span>
      {Number(billingSummary.totalOverdue) > 0 ? (
        <span className="min-w-0 truncate text-xs font-medium text-red-600">
          {formatCurrency(billingSummary.totalOverdue, currency)} vencido
        </span>
      ) : (
        <span className="text-xs font-medium text-primary">Ver →</span>
      )}
    </Link>
  );
}

/**
 * Home de ADMIN/COORDINATOR. Los agregados de órdenes (conteos, promedio de
 * resolución, ranking de técnicos, recientes) vienen ya calculados de GET
 * /work-orders/stats (ver WorkOrdersService.getStats) — una sola consulta
 * rápida, así que el saludo y los KPIs/paneles que dependen de ella se
 * esperan juntos. Inventario y facturación son consultas más pesadas e
 * independientes entre sí, así que cada una vive en su propio límite de
 * Suspense: si una tarda, no bloquea el resto de la pantalla.
 */
export async function AdminDashboard({ session }: AdminDashboardProps) {
  const isAdmin = session.role === "ADMIN";

  const [company, stats] = await Promise.all([getCompany(), getWorkOrderStats()]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hola, {session.name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatToday()} · {company.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ordenes/nueva" className={buttonVariants({ variant: "default" })}>
            Nueva orden
          </Link>
          <Link href="/clientes/nuevo" className={buttonVariants({ variant: "outline" })}>
            Nuevo cliente
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard
          href="/ordenes"
          label="Órdenes activas"
          value={stats.activeCount}
          icon={ClipboardList}
        />
        <KpiCard
          href="/ordenes?unassigned=true"
          label="Sin asignar"
          value={stats.unassignedActiveCount}
          icon={UserRoundX}
          tone={stats.unassignedActiveCount > 0 ? "warning" : "default"}
        />
        <Suspense fallback={<Skeleton className="h-24" />}>
          <InventoryKpi />
        </Suspense>
        <KpiCard
          href="/mantenimiento"
          label="Mantenimientos por vencer"
          value={stats.maintenanceDueCount}
          icon={Wrench}
          tone={stats.maintenanceDueCount > 0 ? "warning" : "default"}
        />
        <KpiCard
          href="/cotizaciones?filter=por-seguir"
          label="Cotizaciones por seguir"
          value={stats.quotesFollowUpCount}
          icon={PhoneCall}
          tone={stats.quotesFollowUpCount > 0 ? "warning" : "default"}
        />
        {isAdmin && (
          <Suspense fallback={<Skeleton className="h-24" />}>
            <BillingCard currency={company.currency} />
          </Suspense>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TechnicianPerformancePanel
          ranking={stats.technicianRanking}
          avgResolutionDays={stats.avgResolutionDays}
        />
        <OrdersByStatusPanel statusCounts={stats.statusCounts} />
        <RecentOrdersPanel orders={stats.recentOrders} />
        <Suspense fallback={<Skeleton className="h-48" />}>
          <InventoryAlerts />
        </Suspense>
      </div>
    </div>
  );
}
