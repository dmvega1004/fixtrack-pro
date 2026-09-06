"use client";

import { saveDiagnosisAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { enqueueWorkOrderField } from "@/lib/queue/producers";
import { LongTextFieldEditor } from "./long-text-field-editor";

interface DiagnosisEditorProps {
  orderId: string;
  userId: string;
  initialDiagnosis: string | null;
  isTerminal: boolean;
}

/** Etapa 2-C: sin señal, encola en vez de llamar la Server Action de siempre — ver description-editor.tsx. */
export function DiagnosisEditor({
  orderId,
  userId,
  initialDiagnosis,
  isTerminal,
}: DiagnosisEditorProps) {
  const isOnline = useOnlineStatus();

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
      onSave={async (value) => {
        if (!isOnline) {
          await enqueueWorkOrderField(orderId, userId, "diagnosis", value);
          return { ok: true };
        }
        return saveDiagnosisAction(orderId, value);
      }}
    />
  );
}
