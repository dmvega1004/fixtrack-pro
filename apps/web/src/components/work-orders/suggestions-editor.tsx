"use client";

import { saveSuggestionsAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { enqueueWorkOrderField } from "@/lib/queue/producers";
import { saveDirectOrEnqueue } from "@/lib/queue/save-direct-or-enqueue";
import { LongTextFieldEditor } from "./long-text-field-editor";

interface SuggestionsEditorProps {
  orderId: string;
  /** Solo para la pantalla de estado de la cola (ver lib/queue/producers.ts). */
  orderNumber: number;
  userId: string;
  initialSuggestions: string | null;
  isTerminal: boolean;
}

/** Sin señal, o si la red falla al guardar, encola — ver lib/queue/save-direct-or-enqueue.ts. */
export function SuggestionsEditor({
  orderId,
  orderNumber,
  userId,
  initialSuggestions,
  isTerminal,
}: SuggestionsEditorProps) {
  return (
    <LongTextFieldEditor
      fieldId="suggestions"
      label="Sugerencias y recomendaciones"
      initialValue={initialSuggestions}
      isTerminal={isTerminal}
      placeholder="Sin sugerencias registradas"
      saveButtonLabel="Guardar sugerencias"
      savingButtonLabel="Guardando..."
      successMessage="Sugerencias guardadas"
      defaultErrorMessage="No se pudo guardar las sugerencias"
      onSave={(value) =>
        saveDirectOrEnqueue({
          userId,
          orderId,
          direct: () => saveSuggestionsAction(orderId, value),
          enqueue: () => enqueueWorkOrderField({ id: orderId, orderNumber }, userId, "suggestions", value),
        })
      }
    />
  );
}
