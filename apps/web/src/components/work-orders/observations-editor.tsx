"use client";

import { saveObservationsAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { enqueueWorkOrderField } from "@/lib/queue/producers";
import { LongTextFieldEditor } from "./long-text-field-editor";

interface ObservationsEditorProps {
  orderId: string;
  /** Solo para la pantalla de estado de la cola (ver lib/queue/producers.ts). */
  orderNumber: number;
  userId: string;
  initialObservations: string | null;
  isTerminal: boolean;
}

/** Etapa 2-C: sin señal, encola en vez de llamar la Server Action de siempre — ver description-editor.tsx. */
export function ObservationsEditor({
  orderId,
  orderNumber,
  userId,
  initialObservations,
  isTerminal,
}: ObservationsEditorProps) {
  const isOnline = useOnlineStatus();

  return (
    <LongTextFieldEditor
      fieldId="observations"
      label="Observaciones del servicio"
      initialValue={initialObservations}
      isTerminal={isTerminal}
      placeholder="Sin observaciones registradas"
      saveButtonLabel="Guardar observaciones"
      savingButtonLabel="Guardando..."
      successMessage="Observaciones guardadas"
      defaultErrorMessage="No se pudo guardar las observaciones"
      onSave={async (value) => {
        if (!isOnline) {
          await enqueueWorkOrderField({ id: orderId, orderNumber }, userId, "observations", value);
          return { ok: true };
        }
        return saveObservationsAction(orderId, value);
      }}
    />
  );
}
