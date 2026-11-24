"use client";

import { saveObservationsAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { enqueueWorkOrderField } from "@/lib/queue/producers";
import { saveDirectOrEnqueue } from "@/lib/queue/save-direct-or-enqueue";
import { LongTextFieldEditor } from "./long-text-field-editor";

interface ObservationsEditorProps {
  orderId: string;
  /** Solo para la pantalla de estado de la cola (ver lib/queue/producers.ts). */
  orderNumber: number;
  userId: string;
  initialObservations: string | null;
  isTerminal: boolean;
}

/** Sin señal, o si la red falla al guardar, encola — ver lib/queue/save-direct-or-enqueue.ts. */
export function ObservationsEditor({
  orderId,
  orderNumber,
  userId,
  initialObservations,
  isTerminal,
}: ObservationsEditorProps) {
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
      onSave={(value) =>
        saveDirectOrEnqueue({
          userId,
          orderId,
          direct: () => saveObservationsAction(orderId, value),
          enqueue: () => enqueueWorkOrderField({ id: orderId, orderNumber }, userId, "observations", value),
        })
      }
    />
  );
}
