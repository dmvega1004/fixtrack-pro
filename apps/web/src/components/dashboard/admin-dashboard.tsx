import Link from "next/link";
import { ClipboardList, UserRoundX, PackageX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getUser, getTechnicians } from "@/lib/api/users";
import { getCompany } from "@/lib/api/company";
import { getWorkOrders } from "@/lib/api/work-orders";
import { getSpareParts } from "@/lib/api/spare-parts";
import type { Session } from "@/lib/roles";
import {
  filterActiveOrders,
  filterUnassignedActiveOrders,
  countByStatus,
  averageResolutionDays,
  technicianRanking,
  recentOrders,
  lowStockAlerts,
} from "@/lib/dashboard/summary";
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
 * Home de ADMIN/COORDINATOR. Todos los fetches van en paralelo y todos los
 * cálculos se delegan a src/lib/dashboard/summary.ts (módulo puro).
 * Ver ahí la nota sobre por qué no hay tarjeta de "Ventas del mes".
 */
export async function AdminDashboard({ session }: AdminDashboardProps) {
  const [me, company, workOrders, lowStockParts, technicians] = await Promise.all([
    getUser(session.userId),
    getCompany(),
    getWorkOrders(),
    getSpareParts({ lowStock: true }),
    getTechnicians(),
  ]);

  const activeOrders = filterActiveOrders(workOrders);
  const unassignedOrders = filterUnassignedActiveOrders(workOrders);
  const statusCounts = countByStatus(workOrders);
  const avgDays = averageResolutionDays(workOrders);
  const ranking = technicianRanking(workOrders, technicians);
  const recent = recentOrders(workOrders, 5);
  const alerts = lowStockAlerts(lowStockParts, 5);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hola, {me.name}</h1>
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
          value={activeOrders.length}
          icon={ClipboardList}
        />
        <KpiCard
          href="/ordenes?unassigned=true"
          label="Sin asignar"
          value={unassignedOrders.length}
          icon={UserRoundX}
          tone={unassignedOrders.length > 0 ? "warning" : "default"}
        />
        <KpiCard
          href="/inventario?lowStock=true"
          label="Stock bajo"
          value={lowStockParts.length}
          icon={PackageX}
          tone={lowStockParts.length > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TechnicianPerformancePanel ranking={ranking} avgResolutionDays={avgDays} />
        <OrdersByStatusPanel statusCounts={statusCounts} />
        <RecentOrdersPanel orders={recent} />
        <InventoryAlertsPanel items={alerts} />
      </div>
    </div>
  );
}
