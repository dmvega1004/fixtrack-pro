"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/components/shared/status-chip";
import { useOnlineStatus } from "@/hooks/use-online-status";

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

interface StatusFilterChipsProps {
  currentStatus?: OrderStatus;
  currentPriority?: string;
  /** Término de búsqueda activo (parámetro `q`) — se propaga para no perderlo al cambiar de estado. */
  currentSearch?: string;
}

export function StatusFilterChips({
  currentStatus,
  currentPriority,
  currentSearch,
}: StatusFilterChipsProps) {
  // Sin conexión, cambiar de chip navegaría a una URL cuyo fetch va a
  // fallar: el service worker la serviría desde su caché ignorando la
  // cadena de consulta (ver apps/mobile.../sw.js, ignoreSearch), así que
  // el filtro ni se aplicaría ni daría error — solo confundiría. Se
  // desactivan en vez de arriesgar eso; la explicación vive junto al
  // buscador (OrdersSearchInput), justo arriba de esto en la página.
  const isOnline = useOnlineStatus();

  function hrefFor(status?: OrderStatus): string {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (currentPriority) params.set("priority", currentPriority);
    if (currentSearch) params.set("q", currentSearch);
    const query = params.toString();
    return query ? `/ordenes?${query}` : "/ordenes";
  }

  function chipClasses(active: boolean): string {
    return cn(
      "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:text-foreground",
      !isOnline && "pointer-events-none opacity-50",
    );
  }

  if (!isOnline) {
    return (
      <div className="flex flex-wrap gap-2">
        <span className={chipClasses(!currentStatus)}>Todas</span>
        {STATUSES.map((status) => (
          <span key={status} className={chipClasses(currentStatus === status)}>
            {ORDER_STATUS_LABELS[status]}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={hrefFor(undefined)} className={chipClasses(!currentStatus)}>
        Todas
      </Link>
      {STATUSES.map((status) => (
        <Link
          key={status}
          href={hrefFor(status)}
          className={chipClasses(currentStatus === status)}
        >
          {ORDER_STATUS_LABELS[status]}
        </Link>
      ))}
    </div>
  );
}
