import { saveDescriptionAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { LongTextFieldEditor } from "./long-text-field-editor";

interface DescriptionEditorProps {
  orderId: string;
  initialDescription: string;
  isTerminal: boolean;
}

/**
 * A diferencia de Diagnóstico y Observaciones, la descripción es
 * obligatoria: identifica de qué se trata la orden en listados, buscador y
 * documentos, así que no puede quedar vacía (required en
 * LongTextFieldEditor).
 */
export function DescriptionEditor({
  orderId,
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
      onSave={(value) => saveDescriptionAction(orderId, value)}
    />
  );
}
