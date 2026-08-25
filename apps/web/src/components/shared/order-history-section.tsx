"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/shared/status-chip";
import { PaymentStatusChip } from "@/components/shared/payment-status-chip";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatEquipmentSummary } from "@/lib/format/equipment-summary";
import { formatDate } from "@/lib/format/dates";
import { formatCurrency } from "@/lib/format/currency";
import type { WorkOrder } from "@/lib/api/work-orders";

const DEBOUNCE_MS = 400;
const MOBILE_PREVIEW_COUNT = 5;

interface OrderHistorySectionProps {
  /** TODAS las órdenes del cliente/equipo, ya cargadas (sin límite) y ordenadas desc por fecha. */
  orders: WorkOrder[];
  isAdmin: boolean;
  /** Moneda de la empresa: habilita la columna de valor. Solo la ficha de cliente la pasa. */
  currency?: string;
  /** Órdenes abiertas: id -> valor estimado en vivo (sin total congelado). Solo ficha de cliente. */
  estimatedValueByOrderId?: Map<string, number>;
  emptyMessage: string;
  /** Enlace a /ordenes con el filtro de esta ficha ya aplicado (móvil). */
  viewAllHref: string;
  viewAllLabel: string;
}

function matchesSearch(order: WorkOrder, term: string): boolean {
  if (!term) return true;
  const needle = term.toLowerCase();
  return (
    formatOrderNumber(order.orderNumber).toLowerCase().includes(needle) ||
    order.description.toLowerCase().includes(needle)
  );
}

interface OrderEntryProps {
  order: WorkOrder;
  isAdmin: boolean;
  currency?: string;
  estimatedValue?: number;
}

function resolveValue(order: WorkOrder, estimatedValue: number | undefined) {
  if (order.totalAmount !== null) {
    return { value: Number(order.totalAmount), isEstimated: false };
  }
  if (estimatedValue !== undefined) {
    return { value: estimatedValue, isEstimated: true };
  }
  return { value: undefined, isEstimated: false };
}

/** Fila de escritorio (recuadro con scroll interno). */
function OrderRow({ order, isAdmin, currency, estimatedValue }: OrderEntryProps) {
  const { value, isEstimated } = resolveValue(order, estimatedValue);

  return (
    <Link
      href={`/ordenes/${order.id}`}
      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/50"
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{formatOrderNumber(order.orderNumber)}</span>
        <span className="text-xs text-muted-foreground">
          {formatEquipmentSummary(order.equipments)}
        </span>
      </div>
      <span className="flex items-center gap-3">
        {isAdmin && currency && value !== undefined && (
          <span className="flex flex-col items-end">
            <span className="text-sm font-medium">{formatCurrency(value, currency)}</span>
            {isEstimated && (
              <span className="text-[10px] text-muted-foreground italic">estimado</span>
            )}
          </span>
        )}
        {isAdmin && <PaymentStatusChip status={order.paymentStatus} />}
        <StatusChip status={order.status} />
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {formatDate(order.createdAt)}
        </span>
      </span>
    </Link>
  );
}

/**
 * Tarjeta de móvil: tres líneas fijas. La fecha va arriba a la derecha
 * (línea propia, con la OT) — nunca comprimida junto a los chips.
 */
function OrderCard({ order, isAdmin, currency, estimatedValue }: OrderEntryProps) {
  const { value, isEstimated } = resolveValue(order, estimatedValue);

  return (
    <Link
      href={`/ordenes/${order.id}`}
      className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 hover:bg-muted/50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{formatOrderNumber(order.orderNumber)}</span>
        <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
          {formatDate(order.createdAt)}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">
        {formatEquipmentSummary(order.equipments)}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {isAdmin && currency && value !== undefined && (
          <span className="text-sm font-medium">
            {formatCurrency(value, currency)}
            {isEstimated && (
              <span className="ml-1 text-[10px] text-muted-foreground italic">estimado</span>
            )}
          </span>
        )}
        <StatusChip status={order.status} />
        {isAdmin && <PaymentStatusChip status={order.paymentStatus} />}
      </div>
    </Link>
  );
}

/**
 * Historial de órdenes de la ficha de cliente/equipo — compartido entre
 * ambas para no duplicar el mismo bloque (y el mismo bug) dos veces.
 *
 * Escritorio: recuadro de alto fijo con scroll interno (~7 filas visibles).
 * Móvil: SIN scroll interno (un contenedor que se desplaza dentro de una
 * página que también se desplaza es incómodo con el dedo) — se muestran las
 * 5 órdenes más recientes y un enlace a /ordenes con el filtro ya aplicado.
 *
 * El buscador filtra client-side sobre `orders` (ya cargadas), no dispara
 * una consulta nueva — mismo debounce que /ordenes, pero sin tocar la URL.
 */
export function OrderHistorySection({
  orders,
  isAdmin,
  currency,
  estimatedValueByOrderId,
  emptyMessage,
  viewAllHref,
  viewAllLabel,
}: OrderHistorySectionProps) {
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setTerm(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedTerm(next), DEBOUNCE_MS);
  }

  function handleClear() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setTerm("");
    setDebouncedTerm("");
  }

  const filtered = orders.filter((order) => matchesSearch(order, debouncedTerm.trim()));
  const mobileOrders = filtered.slice(0, MOBILE_PREVIEW_COUNT);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold">Historial de órdenes · {orders.length}</h3>
        {orders.length > 0 && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={term}
              onChange={handleChange}
              placeholder="Buscar por OT o descripción..."
              aria-label="Buscar en el historial de órdenes"
              className="pr-8 pl-8"
            />
            {term && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Limpiar búsqueda"
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ninguna orden coincide con &quot;{debouncedTerm.trim()}&quot;.
            </p>
          ) : (
            <>
              <div className="hidden md:block md:max-h-[420px] md:overflow-y-auto md:rounded-lg md:border md:border-border md:px-3">
                <div className="flex flex-col divide-y divide-border">
                  {filtered.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      isAdmin={isAdmin}
                      currency={currency}
                      estimatedValue={estimatedValueByOrderId?.get(order.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 md:hidden">
                {mobileOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isAdmin={isAdmin}
                    currency={currency}
                    estimatedValue={estimatedValueByOrderId?.get(order.id)}
                  />
                ))}
              </div>
            </>
          )}

          <Link
            href={viewAllHref}
            className="text-sm font-medium text-primary hover:underline md:hidden"
          >
            {viewAllLabel}
          </Link>
        </>
      )}
    </div>
  );
}
