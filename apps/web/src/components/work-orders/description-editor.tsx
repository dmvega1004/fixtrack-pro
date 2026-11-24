"use client";

import { saveDescriptionAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { enqueueWorkOrderField } from "@/lib/queue/producers";
import { saveDirectOrEnqueue } from "@/lib/queue/save-direct-or-enqueue";
import { LongTextFieldEditor } from "./long-text-field-editor";

interface DescriptionEditorProps {
  orderId: string;
  /** Solo para la pantalla de estado de la cola (ver lib/queue/producers.ts). */
  orderNumber: number;
  userId: string;
  initialDescription: string;
  isTerminal: boolean;
}

/**
 * A diferencia de Diagnóstico y Observaciones, la descripción es
 * obligatoria: identifica de qué se trata la orden en listados, buscador y
 * documentos, así que no puede quedar vacía (required en
 * LongTextFieldEditor).
 *
 * Sin señal, o si la red falla al guardar, encola en vez de quedarse
 * colgado — ver lib/queue/save-direct-or-enqueue.ts. Diagnóstico,
 * Observaciones y Recomendaciones comparten el mismo criterio.
 */
export function DescriptionEditor({
  orderId,
  orderNumber,
  userId,
  initialDescription,
  isTerminal,
}: DescriptionEditorProps) {
  return (
    <LongTextFieldEditor
      fieldId="description"
      label="Descripción del servicio"
      initialValue={initialDescription}
      isTerminal={isTerminal}
      placeholder="Describe el motivo del servicio"
      saveButtonLabel="Guardar descripción"
      savingButtonLabel="Guardando..."
      successMessage="Descripción guardada"
      defaultErrorMessage="No se pudo guardar la descripción"
      required
      requiredErrorMessage="La descripción no puede quedar vacía"
      onSave={(value) =>
        saveDirectOrEnqueue({
          userId,
          orderId,
          direct: () => saveDescriptionAction(orderId, value),
          enqueue: () => enqueueWorkOrderField({ id: orderId, orderNumber }, userId, "description", value),
        })
      }
    />
  );
}
