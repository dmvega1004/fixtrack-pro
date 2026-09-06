"use client";

import { saveSuggestionsAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { enqueueWorkOrderField } from "@/lib/queue/producers";
import { LongTextFieldEditor } from "./long-text-field-editor";

interface SuggestionsEditorProps {
  orderId: string;
  userId: string;
  initialSuggestions: string | null;
  isTerminal: boolean;
}

/** Etapa 2-C: sin señal, encola en vez de llamar la Server Action de siempre — ver description-editor.tsx. */
export function SuggestionsEditor({
  orderId,
  userId,
  initialSuggestions,
  isTerminal,
}: SuggestionsEditorProps) {
  const isOnline = useOnlineStatus();

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
      onSave={async (value) => {
        if (!isOnline) {
          await enqueueWorkOrderField(orderId, userId, "suggestions", value);
          return { ok: true };
        }
        return saveSuggestionsAction(orderId, value);
      }}
    />
  );
}
