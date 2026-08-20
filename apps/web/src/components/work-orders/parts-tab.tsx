import { formatCurrency } from "@/lib/format/currency";
import type { WorkOrderPartsSummary } from "@/lib/api/work-order-parts";
import type { SparePart } from "@/lib/api/spare-parts";
import type { Payment } from "@/lib/api/payments";
import { RemovePartButton } from "./remove-part-button";
import { AddPartPanel } from "./add-part-panel";
import { BillingSection } from "./billing-section";
import { DirectCostSection } from "./direct-cost-section";
import { PaymentsPanel } from "./payments-panel";

interface PartsTabProps {
  orderId: string;
  summary: WorkOrderPartsSummary;
  catalog: SparePart[];
  isTerminal: boolean;
  currency: string;
  isAdmin: boolean;
  /** true si status es COMPLETED o DELIVERED — condición para admitir pagos. */
  isClosed: boolean;
  payments: Payment[];
}

export function PartsTab({
  orderId,
  summary,
  catalog,
  isTerminal,
  currency,
  isAdmin,
  isClosed,
  payments,
}: PartsTabProps) {
  const { items, totalSale, totalCost, billing, directCostAmount, directCostDescription } =
    summary;
  const balance = (Number(billing.total) - Number(billing.paidAmount)).toFixed(2);
  const margin =
    totalCost !== undefined
      ? Number(totalSale) - Number(totalCost)
      : undefined;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin repuestos registrados.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Repuesto</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Cantidad</th>
                  <th className="px-4 py-3 font-medium">Precio unitario</th>
                  <th className="px-4 py-3 font-medium">Subtotal</th>
                  {!isTerminal && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">{line.sparePart.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.sparePart.sku}
                    </td>
                    <td className="px-4 py-3">{line.quantity}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(line.unitPrice, currency)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(
                        Number(line.unitPrice) * line.quantity,
                        currency,
                      )}
                    </td>
                    {!isTerminal && (
                      <td className="px-4 py-3 text-right">
                        <RemovePartButton
                          orderId={orderId}
                          sparePartId={line.sparePartId}
                          partName={line.sparePart.name}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {items.map((line) => (
              <div
                key={line.id}
                className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{line.sparePart.name}</span>
                  {!isTerminal && (
                    <RemovePartButton
                      orderId={orderId}
                      sparePartId={line.sparePartId}
                      partName={line.sparePart.name}
                    />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  SKU {line.sparePart.sku}
                </span>
                <div className="flex justify-between text-sm">
                  <span>
                    {line.quantity} × {formatCurrency(line.unitPrice, currency)}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(
                      Number(line.unitPrice) * line.quantity,
                      currency,
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal repuestos</span>
              <span className="font-semibold">
                {formatCurrency(totalSale, currency)}
              </span>
            </div>
            {totalCost !== undefined && (
              <div className="flex justify-between text-muted-foreground">
                <span>Costo total</span>
                <span>{formatCurrency(totalCost, currency)}</span>
              </div>
            )}
            {margin !== undefined && (
              <div className="flex justify-between text-muted-foreground">
                <span>Margen</span>
                <span>{formatCurrency(margin, currency)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {!isTerminal && <AddPartPanel orderId={orderId} catalog={catalog} />}

      <BillingSection
        orderId={orderId}
        billing={billing}
        partsTotal={totalSale}
        currency={currency}
        isAdmin={isAdmin}
        isTerminal={isTerminal}
      />

      {isAdmin && directCostAmount !== undefined && (
        <DirectCostSection
          orderId={orderId}
          directCostAmount={directCostAmount}
          directCostDescription={directCostDescription ?? null}
          currency={currency}
        />
      )}

      {isAdmin && isClosed && (
        <PaymentsPanel
          orderId={orderId}
          payments={payments}
          balance={balance}
          currency={currency}
        />
      )}
    </div>
  );
}
