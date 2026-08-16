"use client";

import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { deleteQuoteAction } from "@/app/(dashboard)/cotizaciones/actions";

interface DeleteQuoteButtonProps {
  quoteId: string;
  /** Ej. "COT-0002". */
  quoteLabel: string;
}

/**
 * Solo ADMIN puede ver este botón (candado de rol replicado en el
 * componente padre y en el backend). El padre también restringe la
 * visibilidad a cotizaciones en borrador — una vez emitida, el backend
 * rechaza el borrado con 409 (número consecutivo ya consumido).
 */
export function DeleteQuoteButton({ quoteId, quoteLabel }: DeleteQuoteButtonProps) {
  return (
    <DeleteEntityButton
      itemLabel={`la cotización ${quoteLabel}`}
      triggerLabel="Eliminar cotización"
      onDelete={() => deleteQuoteAction(quoteId)}
      redirectTo="/cotizaciones"
      successMessage="Cotización eliminada"
    />
  );
}
