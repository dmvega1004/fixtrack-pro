"use client";

import { saveDiagnosisAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { enqueueWorkOrderField } from "@/lib/queue/producers";
import { saveDirectOrEnqueue } from "@/lib/queue/save-direct-or-enqueue";
import { LongTextFieldEditor } from "./long-text-field-editor";

interface DiagnosisEditorProps {
  orderId: string;
  /** Solo para la pantalla de estado de la cola (ver lib/queue/producers.ts). */
  orderNumber: number;
  userId: string;
  initialDiagnosis: string | null;
  isTerminal: boolean;
}

/** Sin señal, o si la red falla al guardar, encola — ver lib/queue/save-direct-or-enqueue.ts. */
export function DiagnosisEditor({
  orderId,
  orderNumber,
  userId,
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
      onSave={(value) =>
        saveDirectOrEnqueue({
          userId,
          orderId,
          direct: () => saveDiagnosisAction(orderId, value),
          enqueue: () => enqueueWorkOrderField({ id: orderId, orderNumber }, userId, "diagnosis", value),
        })
      }
    />
  );
}
