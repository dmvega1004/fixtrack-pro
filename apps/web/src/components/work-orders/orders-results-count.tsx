"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSyncState } from "@/hooks/use-sync-state";

interface OrdersResultsCountProps {
  /** Total real del servidor (GET /work-orders/count) — lo que server-renderiza la página. */
  total: number;
  /** "Sin asignar" no tiene camino offline propio (ver OrdersListWithLoadMore): el total del servidor es lo único que hay. */
  unassignedOnly: boolean;
}

/**
 * El total de /ordenes se server-renderiza — con señal, es el mismo
 * conteo de siempre. Sin señal, esa cifra queda congelada en el HTML que
 * alcanzó a precachear el service worker (ver sw.js), mientras la lista
 * de abajo (OrdersListWithLoadMore) YA cambia de fuente al conjunto de
 * trabajo guardado: "47 resultados" arriba con 30 tarjetas abajo. Este
 * componente existe solo para que el número de arriba sea SIEMPRE el
 * mismo que cuenta lo de abajo, así se decida ahí o acá.
 */
export function OrdersResultsCount({ total, unassignedOnly }: OrdersResultsCountProps) {
  const isOnline = useOnlineStatus();
  const { workset } = useSyncState();

  const count = !isOnline && !unassignedOnly && workset ? workset.orders.length : total;

  return (
    <p className="text-sm text-muted-foreground">
      {count} {count === 1 ? "resultado" : "resultados"}
      {unassignedOnly && " · sin asignar"}
    </p>
  );
}
