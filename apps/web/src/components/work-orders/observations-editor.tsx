import { saveObservationsAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { LongTextFieldEditor } from "./long-text-field-editor";

interface ObservationsEditorProps {
  orderId: string;
  initialObservations: string | null;
  isTerminal: boolean;
}

export function ObservationsEditor({
  orderId,
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
      onSave={(value) => saveObservationsAction(orderId, value)}
    />
  );
}
