import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format/currency";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatCollectionNumber } from "@/lib/format/collection-number";
import { DaysChip } from "./days-chip";

export interface ReceivableRow {
  orderId: string;
  orderNumber: number;
  collectionNumber: number | null;
  clientName: string;
  description: string;
  total: string;
  paid: string;
  balance: string;
  daysSinceBilled: number;
  paymentTermDays: number;
  isOverdue: boolean;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
}

export type ReceivablesFilter = "por-cobrar" | "vencidas" | "pagadas";

const FILTERS: { key: ReceivablesFilter; label: string }[] = [
  { key: "por-cobrar", label: "Por cobrar" },
  { key: "vencidas", label: "Vencidas" },
  { key: "pagadas", label: "Pagadas" },
];

function PaidBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
      Pagada
    </span>
  );
}

function StatusChipFor({ row }: { row: ReceivableRow }) {
  if (row.paymentStatus === "PAID") return <PaidBadge />;
  return (
    <DaysChip
      daysSinceBilled={row.daysSinceBilled}
      paymentTermDays={row.paymentTermDays}
      isOverdue={row.isOverdue}
    />
  );
}

interface ReceivablesPanelProps {
  rows: ReceivableRow[];
  activeFilter: ReceivablesFilter;
  currency: string;
}

/** Listado de cuentas por cobrar: tabla en escritorio, tarjetas en móvil. */
export function ReceivablesPanel({ rows, activeFilter, currency }: ReceivablesPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={`/cobros?filter=${filter.key}`}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
              activeFilter === filter.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No hay órdenes en este filtro.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Orden</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Abonado</th>
                  <th className="px-4 py-3 font-medium">Saldo</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => {
                  const href = `/ordenes/${row.orderId}`;
                  return (
                    <tr key={row.orderId} className="hover:bg-muted/50">
                      <td className="p-0">
                        <Link href={href} className="flex flex-col px-4 py-3">
                          <span className="font-medium">
                            {formatOrderNumber(row.orderNumber)}
                          </span>
                          {row.collectionNumber !== null && (
                            <span className="text-xs text-muted-foreground">
                              {formatCollectionNumber(row.collectionNumber)}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className="block px-4 py-3">
                          {row.clientName}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={href}
                          className="block max-w-52 truncate px-4 py-3 text-muted-foreground"
                        >
                          {row.description}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className="block px-4 py-3">
                          {formatCurrency(row.total, currency)}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className="block px-4 py-3">
                          {formatCurrency(row.paid, currency)}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className="block px-4 py-3 font-medium">
                          {formatCurrency(row.balance, currency)}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className="block px-4 py-3">
                          <StatusChipFor row={row} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <Link
                key={row.orderId}
                href={`/ordenes/${row.orderId}`}
                className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-blue-600">
                    {formatOrderNumber(row.orderNumber)}
                  </span>
                  <StatusChipFor row={row} />
                </div>
                {row.collectionNumber !== null && (
                  <span className="text-xs text-muted-foreground">
                    {formatCollectionNumber(row.collectionNumber)}
                  </span>
                )}
                <span className="text-sm font-medium">{row.clientName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {row.description}
                </span>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">Saldo</span>
                  <span className="font-semibold">
                    {formatCurrency(row.balance, currency)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
