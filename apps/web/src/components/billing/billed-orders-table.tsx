import Link from "next/link";
import { formatCurrency } from "@/lib/format/currency";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatCollectionNumber } from "@/lib/format/collection-number";
import { formatDate } from "@/lib/format/dates";
import { PaymentStatusChip } from "@/components/shared/payment-status-chip";
import type { BilledOrder } from "@/lib/api/billing";

interface BilledOrdersTableProps {
  items: BilledOrder[];
  currency: string;
}

/** Detalle de "Facturado del mes": tabla en escritorio, tarjetas en móvil. */
export function BilledOrdersTable({ items, currency }: BilledOrdersTableProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        Ninguna orden se ha facturado este mes todavía.
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
              <th className="px-4 py-3 font-medium">Fecha de facturación</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Estado de pago</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const href = `/ordenes/${item.orderId}`;
              return (
                <tr key={item.orderId} className="hover:bg-muted/50">
                  <td className="p-0">
                    <Link href={href} className="flex flex-col px-4 py-3">
                      <span className="font-medium">
                        {formatOrderNumber(item.orderNumber)}
                      </span>
                      {item.collectionNumber !== null && (
                        <span className="text-xs text-muted-foreground">
                          {formatCollectionNumber(item.collectionNumber)}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-3">
                      {item.clientName}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-3 text-muted-foreground">
                      {formatDate(item.billedAt)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-3 tabular-nums">
                      {formatCurrency(item.total, currency)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-3">
                      <PaymentStatusChip status={item.paymentStatus} />
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
              <PaymentStatusChip status={item.paymentStatus} />
            </div>
            {item.collectionNumber !== null && (
              <span className="text-xs text-muted-foreground">
                {formatCollectionNumber(item.collectionNumber)}
              </span>
            )}
            <span className="text-sm font-medium">{item.clientName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(item.billedAt)}
            </span>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(item.total, currency)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
