"use client";

import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatCollectionNumber } from "@/lib/format/collection-number";
import { deleteWorkOrderAction, changeStatusAction } from "@/app/(dashboard)/ordenes/[id]/actions";

interface DeleteOrderButtonProps {
  orderId: string;
  orderNumber: number;
  /** Consecutivo de la cuenta de cobro emitida sobre esta orden; null hasta que se genera. */
  collectionNumber: number | null;
}

/**
 * Solo ADMIN puede ver este botón (candado de rol replicado en el
 * componente padre y en el backend). Una cuenta de cobro emitida ya NO
 * bloquea el borrado — solo advierte del hueco que deja en el
 * consecutivo. El backend sí sigue bloqueando (409) si la orden tiene
 * pagos registrados: eso lo resuelve el botón alterno "Marcar como
 * Cancelada" cuando aparece.
 */
export function DeleteOrderButton({
  orderId,
  orderNumber,
  collectionNumber,
}: DeleteOrderButtonProps) {
  const expected = formatOrderNumber(orderNumber);

  return (
    <DeleteEntityButton
      itemLabel={expected}
      triggerLabel="Eliminar orden"
      onDelete={() => deleteWorkOrderAction(orderId)}
      redirectTo="/ordenes"
      successMessage={`${expected} eliminada`}
      blocked={{
        label: "Marcar como Cancelada",
        action: () => changeStatusAction(orderId, "CANCELLED"),
        successMessage: `${expected} marcada como Cancelada`,
      }}
    >
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>Se eliminará permanentemente:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>La orden {expected} y toda su información.</li>
          <li>Sus fotos adjuntas.</li>
        </ul>
        <p>
          Los repuestos consumidos por esta orden volverán al inventario
          automáticamente.
        </p>
        {collectionNumber !== null && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
            Esta orden tiene la cuenta de cobro{" "}
            {formatCollectionNumber(collectionNumber)} emitida. Al eliminarla
            quedará un hueco permanente en el consecutivo de cuentas de
            cobro, y si el cliente pregunta por ese número no habrá registro
            de él. ¿Continuar de todos modos?
          </p>
        )}
      </div>
    </DeleteEntityButton>
  );
}
