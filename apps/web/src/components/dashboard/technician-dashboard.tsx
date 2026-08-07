import Link from "next/link";
import { QrCode } from "lucide-react";
import { getWorkOrders } from "@/lib/api/work-orders";
import { WorkOrderCard } from "@/components/work-orders/work-order-card";
import type { Session } from "@/lib/roles";
import { filterActiveOrders, countCompletedOrDeliveredInMonth } from "@/lib/dashboard/summary";

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

/**
 * Home del Técnico: pantalla operativa mobile-first, sin KPIs financieros
 * ni ranking de compañeros. El nombre viaja en el JWT (ver JwtPayload en el
 * backend), así que no hace falta GET /users/:id (ADMIN/COORDINATOR-only)
 * para saludar al técnico por su nombre.
 */
export async function TechnicianDashboard({ session }: TechnicianDashboardProps) {
  // El backend ya limita GET /work-orders a las órdenes asignadas al técnico.
  const workOrders = await getWorkOrders();
  const activeOrders = filterActiveOrders(workOrders);
  const completedThisMonth = countCompletedOrDeliveredInMonth(workOrders);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Hola, {session.name}</h1>
        <p className="text-sm text-muted-foreground">{formatToday()}</p>
      </div>

      <Link
        href="/escanear"
        className="flex flex-col items-center justify-center gap-2 rounded-xl bg-primary p-8 text-center text-primary-foreground shadow-sm transition-opacity active:opacity-90"
      >
        <QrCode className="size-10" />
        <span className="text-lg font-semibold">Escanear equipo</span>
      </Link>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mis órdenes</h2>
        <span className="text-sm text-muted-foreground">
          {completedThisMonth} {completedThisMonth === 1 ? "completada" : "completadas"} este mes
        </span>
      </div>

      {activeOrders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
          <p className="text-sm text-muted-foreground">Aún no tienes órdenes activas asignadas.</p>
          <Link href="/escanear" className="text-sm font-medium text-primary">
            Escanea un equipo para empezar →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeOrders.map((order) => (
            <WorkOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
