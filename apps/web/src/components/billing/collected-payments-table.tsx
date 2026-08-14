import Link from "next/link";
import { formatCurrency } from "@/lib/format/currency";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatCollectionNumber } from "@/lib/format/collection-number";
import { formatDate } from "@/lib/format/dates";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-method";
import type { CollectedPayment } from "@/lib/api/billing";

interface CollectedPaymentsTableProps {
  items: CollectedPayment[];
  currency: string;
}

/** Detalle de "Cobrado del mes": tabla en escritorio, tarjetas en móvil. */
export function CollectedPaymentsTable({ items, currency }: CollectedPaymentsTableProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        Ningún pago se ha registrado este mes todavía.
      </p>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-32 px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="w-28 px-4 py-3 font-medium">Orden</th>
              <th className="w-32 px-4 py-3 font-medium">Medio de pago</th>
              <th className="w-36 px-4 py-3 font-medium">Referencia</th>
              <th className="w-36 px-4 py-3 text-right font-medium">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const href = `/ordenes/${item.orderId}`;
              return (
                <tr key={item.paymentId} className="hover:bg-muted/50">
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-3 text-muted-foreground">
                      {formatDate(item.paidAt)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block truncate px-4 py-3" title={item.clientName}>
                      {item.clientName}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="flex flex-col px-4 py-3">
                      <span className="whitespace-nowrap font-medium">
                        {formatOrderNumber(item.orderNumber)}
                      </span>
                      {item.collectionNumber !== null && (
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatCollectionNumber(item.collectionNumber)}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block truncate px-4 py-3">
                      {PAYMENT_METHOD_LABELS[item.method]}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block truncate px-4 py-3 text-muted-foreground">
                      {item.reference ?? "—"}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-3 text-right tabular-nums">
                      {formatCurrency(item.amount, currency)}
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
            key={item.paymentId}
            href={`/ordenes/${item.orderId}`}
            className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-blue-600">
                {formatOrderNumber(item.orderNumber)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(item.paidAt)}
              </span>
            </div>
            {item.collectionNumber !== null && (
              <span className="text-xs text-muted-foreground">
                {formatCollectionNumber(item.collectionNumber)}
              </span>
            )}
            <span className="text-sm font-medium">{item.clientName}</span>
            <span className="text-xs text-muted-foreground">
              {PAYMENT_METHOD_LABELS[item.method]}
              {item.reference ? ` · ${item.reference}` : ""}
            </span>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-muted-foreground">Monto</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(item.amount, currency)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
