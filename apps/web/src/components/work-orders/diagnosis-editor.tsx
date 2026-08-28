"use client";

import { saveDiagnosisAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { LongTextFieldEditor } from "./long-text-field-editor";

interface DiagnosisEditorProps {
  orderId: string;
  initialDiagnosis: string | null;
  isTerminal: boolean;
}

export function DiagnosisEditor({
  orderId,
  initialDiagnosis,
  isTerminal,
}: DiagnosisEditorProps) {
  return (
    <LongTextFieldEditor
      fieldId="diagnosis"
      label="Diagnóstico"
      initialValue={initialDiagnosis}
      isTerminal={isTerminal}
      placeholder="Sin diagnóstico registrado"
      saveButtonLabel="Guardar diagnóstico"
      savingButtonLabel="Guardando..."
      successMessage="Diagnóstico guardado"
      defaultErrorMessage="No se pudo guardar el diagnóstico"
      onSave={(value) => saveDiagnosisAction(orderId, value)}
    />
  );
}
