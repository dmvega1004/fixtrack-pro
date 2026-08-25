"use client";

import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { formatQuoteNumber } from "@/lib/format/quote-number";
import { deleteQuoteAction } from "@/app/(dashboard)/cotizaciones/actions";

interface DeleteQuoteButtonProps {
  quoteId: string;
  /** Ej. "COT-0002". */
  quoteLabel: string;
  /** Consecutivo de la cotización; null si sigue en borrador (sin número asignado todavía). */
  quoteNumber: number | null;
}

/**
 * Solo ADMIN puede ver este botón (candado de rol replicado en el
 * componente padre y en el backend), en CUALQUIER estado — enviada,
 * aceptada o rechazada incluidas. Una cotización no es evidencia contable
 * como una cuenta de cobro, así que basta con advertir del hueco que deja
 * en el consecutivo cuando ya tiene número asignado.
 */
export function DeleteQuoteButton({
  quoteId,
  quoteLabel,
  quoteNumber,
}: DeleteQuoteButtonProps) {
  return (
    <DeleteEntityButton
      itemLabel={`la cotización ${quoteLabel}`}
      triggerLabel="Eliminar cotización"
      onDelete={() => deleteQuoteAction(quoteId)}
      redirectTo="/cotizaciones"
      successMessage="Cotización eliminada"
    >
      {quoteNumber !== null && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Esta cotización tiene el número {formatQuoteNumber(quoteNumber)}{" "}
          asignado. Al eliminarla quedará un hueco permanente en el
          consecutivo de cotizaciones. ¿Continuar de todos modos?
        </p>
      )}
    </DeleteEntityButton>
  );
}
