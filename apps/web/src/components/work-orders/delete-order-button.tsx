"use client";

import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { formatOrderNumber } from "@/lib/format/order-number";
import { deleteWorkOrderAction, changeStatusAction } from "@/app/(dashboard)/ordenes/[id]/actions";

interface DeleteOrderButtonProps {
  orderId: string;
  orderNumber: number;
}

/** Solo ADMIN puede ver este botón (candado de rol replicado en el componente padre y en el backend). */
export function DeleteOrderButton({ orderId, orderNumber }: DeleteOrderButtonProps) {
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
      </div>
    </DeleteEntityButton>
  );
}
