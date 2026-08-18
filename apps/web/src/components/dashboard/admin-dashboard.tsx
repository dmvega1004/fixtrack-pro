import Link from "next/link";
import { ClipboardList, UserRoundX, PackageX, PhoneCall, Wallet, Wrench } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
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
 * Home de ADMIN/COORDINATOR. Todos los fetches van en paralelo. Los
 * agregados de órdenes (conteos, promedio de resolución, ranking de
 * técnicos, recientes) vienen ya calculados de GET /work-orders/stats
 * (ver WorkOrdersService.getStats) — antes se pedían TODAS las órdenes de
 * la empresa en cada visita al home y se calculaban acá en JS. Solo las
 * alertas de inventario (lowStockAlerts) siguen siendo un cálculo local,
 * sobre una lista ya acotada por el backend (?lowStock=true).
 */
export async function AdminDashboard({ session }: AdminDashboardProps) {
  const isAdmin = session.role === "ADMIN";

  const [company, stats, lowStockParts, billingSummary] = await Promise.all([
    getCompany(),
    getWorkOrderStats(),
    getSpareParts({ lowStock: true }),
    // GET /billing/summary es solo ADMIN (403 para Coordinador) — esta home
    // la comparten ambos roles.
    isAdmin ? getBillingSummary() : Promise.resolve(null),
  ]);

  const alerts = lowStockAlerts(lowStockParts, 5);

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
        <KpiCard
          href="/inventario?lowStock=true"
          label="Stock bajo"
          value={lowStockParts.length}
          icon={PackageX}
          tone={lowStockParts.length > 0 ? "danger" : "default"}
        />
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
        {billingSummary && (
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
              {formatCurrency(billingSummary.totalReceivable, company.currency)}
            </span>
            {Number(billingSummary.totalOverdue) > 0 ? (
              <span className="min-w-0 truncate text-xs font-medium text-red-600">
                {formatCurrency(billingSummary.totalOverdue, company.currency)} vencido
              </span>
            ) : (
              <span className="text-xs font-medium text-primary">Ver →</span>
            )}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TechnicianPerformancePanel
          ranking={stats.technicianRanking}
          avgResolutionDays={stats.avgResolutionDays}
        />
        <OrdersByStatusPanel statusCounts={stats.statusCounts} />
        <RecentOrdersPanel orders={stats.recentOrders} />
        <InventoryAlertsPanel items={alerts} />
      </div>
    </div>
  );
}
