import { formatCurrency } from "@/lib/format/currency";
import type { WorkOrderPartsSummary } from "@/lib/api/work-order-parts";
import type { SparePart } from "@/lib/api/spare-parts";
import type { Payment } from "@/lib/api/payments";
import type { Retention } from "@/lib/api/retentions";
import { RemovePartButton } from "./remove-part-button";
import { AddPartPanel } from "./add-part-panel";
import { BillingSection } from "./billing-section";
import { ConceptsSection } from "./concepts-section";
import { RetentionsSection } from "./retentions-section";
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
  /** Consecutivo de la cuenta de cobro emitida sobre esta orden; null hasta que se genera. Ausente para TECHNICIAN. */
  collectionNumber?: number | null;
  /** Catálogo de retenciones de la empresa — vacío si el rol no es ADMIN. */
  retentionCatalog: Retention[];
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
  collectionNumber,
  retentionCatalog,
}: PartsTabProps) {
  const {
    items,
    totalSale,
    totalCost,
    concepts,
    billing,
    directCostAmount,
    directCostDescription,
  } = summary;
  // RBAC financiero: totalSale/billing vienen omitidos del todo para
  // TECHNICIAN (ver WorkOrderPartsService.listParts) — ni un precio
  // unitario, ni el subtotal de repuestos, ni el cierre económico.
  const hasFinancials = billing !== undefined && totalSale !== undefined;
  const conceptsTotal = (concepts ?? []).reduce(
    (sum, concept) => sum + Number(concept.quantity) * Number(concept.unitPrice),
    0,
  );
  // netAmount, NUNCA total: es lo que el cliente REALMENTE va a consignar
  // (total menos retenciones) — con retenciones, el saldo mostrado acá
  // debe coincidir con el que valida PaymentsService al registrar un pago.
  // Sin retenciones, netAmount llega igual a total.
  const balance = billing
    ? (Number(billing.netAmount ?? billing.total) - Number(billing.paidAmount)).toFixed(2)
    : "0";
  const margin =
    totalCost !== undefined && totalSale !== undefined
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
                  {hasFinancials && (
                    <>
                      <th className="px-4 py-3 font-medium">Precio unitario</th>
                      <th className="px-4 py-3 font-medium">Subtotal</th>
                    </>
                  )}
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
                    {hasFinancials && line.unitPrice !== undefined && (
                      <>
                        <td className="px-4 py-3">
                          {formatCurrency(line.unitPrice, currency)}
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(
                            Number(line.unitPrice) * line.quantity,
                            currency,
                          )}
                        </td>
                      </>
                    )}
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
                {hasFinancials && line.unitPrice !== undefined ? (
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
                ) : (
                  <span className="text-sm">Cantidad: {line.quantity}</span>
                )}
              </div>
            ))}
          </div>

          {hasFinancials && (
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
          )}
        </>
      )}

      {!isTerminal && <AddPartPanel orderId={orderId} catalog={catalog} />}

      {/* RBAC financiero: concepts viene omitido del todo para TECHNICIAN —
          igual criterio que billing, ver WorkOrderPartsService.listParts. */}
      {concepts !== undefined && billing !== undefined && (
        <ConceptsSection
          orderId={orderId}
          concepts={concepts}
          currency={currency}
          isAdmin={isAdmin}
          isFrozen={billing.isFrozen}
          isTerminal={isTerminal}
        />
      )}

      {/* RBAC financiero: billing viene omitido del todo para TECHNICIAN —
          sin cierre económico que mostrar, no hay nada que renderizar. */}
      {billing !== undefined && totalSale !== undefined && (
        <BillingSection
          orderId={orderId}
          billing={billing}
          partsTotal={totalSale}
          conceptsTotal={String(conceptsTotal)}
          currency={currency}
          isAdmin={isAdmin}
          isTerminal={isTerminal}
          collectionNumber={collectionNumber}
        />
      )}

      {billing !== undefined && (
        <RetentionsSection
          orderId={orderId}
          billing={billing}
          retentionCatalog={retentionCatalog}
          isAdmin={isAdmin}
          isTerminal={isTerminal}
          currency={currency}
        />
      )}

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
