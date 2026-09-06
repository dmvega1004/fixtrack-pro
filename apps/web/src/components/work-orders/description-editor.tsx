"use client";

import { saveDescriptionAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { enqueueWorkOrderField } from "@/lib/queue/producers";
import { LongTextFieldEditor } from "./long-text-field-editor";

interface DescriptionEditorProps {
  orderId: string;
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
 * Etapa 2-C: sin señal, encola en vez de llamar la Server Action de
 * siempre — ver diagnosis-editor.tsx/observations-editor.tsx/
 * suggestions-editor.tsx, que comparten el mismo criterio.
 */
export function DescriptionEditor({
  orderId,
  userId,
  initialDescription,
  isTerminal,
}: DescriptionEditorProps) {
  const isOnline = useOnlineStatus();

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
      onSave={async (value) => {
        if (!isOnline) {
          await enqueueWorkOrderField(orderId, userId, "description", value);
          return { ok: true };
        }
        return saveDescriptionAction(orderId, value);
      }}
    />
  );
}
