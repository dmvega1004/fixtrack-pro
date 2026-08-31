import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { formatCurrency } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/dates";
import { formatOrderNumber } from "@/lib/format/order-number";
import type {
  ProfitabilityOrder,
  ProfitabilityOrderSortBy,
  ProfitabilitySortOrder,
} from "@/lib/api/profitability";
import { MarginChip } from "./margin-chip";

interface ProfitabilityOrdersTableProps {
  items: ProfitabilityOrder[];
  currency: string;
  from: string;
  to: string;
  sortBy?: ProfitabilityOrderSortBy;
  order: ProfitabilitySortOrder;
}

function sortHref(
  from: string,
  to: string,
  sortBy: ProfitabilityOrderSortBy,
  nextOrder: ProfitabilitySortOrder,
): string {
  return `/cobros/rentabilidad?from=${from}&to=${to}&sortBy=${sortBy}&order=${nextOrder}`;
}

function SortHeader({
  label,
  column,
  from,
  to,
  activeSortBy,
  activeOrder,
  align = "left",
}: {
  label: string;
  column: ProfitabilityOrderSortBy;
  from: string;
  to: string;
  activeSortBy?: ProfitabilityOrderSortBy;
  activeOrder: ProfitabilitySortOrder;
  align?: "left" | "right";
}) {
  const isActive = activeSortBy === column;
  const nextOrder: ProfitabilitySortOrder = isActive && activeOrder === "desc" ? "asc" : "desc";
  const Icon = isActive ? (activeOrder === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;

  return (
    <Link
      href={sortHref(from, to, column, nextOrder)}
      className={`flex items-center gap-1 font-medium hover:text-foreground ${
        align === "right" ? "justify-end" : ""
      } ${isActive ? "text-foreground" : ""}`}
    >
      {label}
      <Icon className="size-3.5" />
    </Link>
  );
}

/** Detalle de órdenes cerradas del período: número, cliente, ingreso, costo, margen y % en semáforo. Ordenable por margen y %. */
export function ProfitabilityOrdersTable({
  items,
  currency,
  from,
  to,
  sortBy,
  order,
}: ProfitabilityOrdersTableProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        No hay órdenes facturadas en este período.
      </p>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Orden</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 text-right font-medium">Ingreso</th>
              <th className="px-4 py-3 text-right font-medium">Costo</th>
              <th className="px-4 py-3 text-right">
                <SortHeader
                  label="Margen"
                  column="margin"
                  from={from}
                  to={to}
                  activeSortBy={sortBy}
                  activeOrder={order}
                  align="right"
                />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader
                  label="%"
                  column="marginPercent"
                  from={from}
                  to={to}
                  activeSortBy={sortBy}
                  activeOrder={order}
                  align="right"
                />
              </th>
              <th
                className="border-l border-border px-4 py-3 text-right font-medium"
                title="Cuánto entró a la cuenta (total menos retenciones) — distinto de cuánto se ganó."
              >
                Neto recibido
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const href = `/ordenes/${item.orderId}`;
              return (
                <tr key={item.orderId} className="hover:bg-muted/50">
                  <td className="p-0">
                    <Link href={href} className="flex flex-col px-4 py-3">
                      <span className="whitespace-nowrap font-medium">
                        {formatOrderNumber(item.orderNumber)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.billedAt)}
                      </span>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block truncate px-4 py-3" title={item.clientName}>
                      {item.clientName}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-3 text-right tabular-nums">
                      {formatCurrency(item.income, currency)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link
                      href={href}
                      className="block px-4 py-3 text-right tabular-nums text-muted-foreground"
                    >
                      {formatCurrency(item.cost, currency)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-3 text-right font-semibold tabular-nums">
                      {formatCurrency(item.margin, currency)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="flex justify-end px-4 py-3">
                      <MarginChip marginPercent={item.marginPercent} />
                    </Link>
                  </td>
                  <td className="border-l border-border p-0">
                    <Link
                      href={href}
                      className="block px-4 py-3 text-right tabular-nums text-muted-foreground"
                    >
                      {formatCurrency(item.netReceived, currency)}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {items.map((item) => (
          <Link
            key={item.orderId}
            href={`/ordenes/${item.orderId}`}
            className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-blue-600">
                {formatOrderNumber(item.orderNumber)}
              </span>
              <MarginChip marginPercent={item.marginPercent} />
            </div>
            <span className="text-sm font-medium">{item.clientName}</span>
            <span className="text-xs text-muted-foreground">{formatDate(item.billedAt)}</span>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-muted-foreground">Ingreso</span>
              <span className="tabular-nums">{formatCurrency(item.income, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Costo</span>
              <span className="tabular-nums">{formatCurrency(item.cost, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Margen</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(item.margin, currency)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 text-sm">
              <span className="text-muted-foreground">Neto recibido</span>
              <span className="tabular-nums">{formatCurrency(item.netReceived, currency)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
