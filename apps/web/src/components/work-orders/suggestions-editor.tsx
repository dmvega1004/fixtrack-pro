"use client";

import { saveSuggestionsAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { LongTextFieldEditor } from "./long-text-field-editor";

interface SuggestionsEditorProps {
  orderId: string;
  initialSuggestions: string | null;
  isTerminal: boolean;
}

export function SuggestionsEditor({
  orderId,
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
      onSave={(value) => saveSuggestionsAction(orderId, value)}
    />
  );
}
