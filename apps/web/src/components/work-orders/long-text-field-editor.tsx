"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/app/(dashboard)/ordenes/[id]/actions";

interface LongTextFieldEditorProps {
  fieldId: string;
  label: string;
  initialValue: string | null;
  isTerminal: boolean;
  placeholder: string;
  saveButtonLabel: string;
  savingButtonLabel: string;
  successMessage: string;
  defaultErrorMessage: string;
  /** Diagnóstico y Observaciones pueden quedar vacíos; Descripción no. */
  required?: boolean;
  requiredErrorMessage?: string;
  onSave: (value: string) => Promise<ActionResult>;
}

/**
 * Edición de un campo de texto largo del detalle de la orden (Diagnóstico,
 * Observaciones, Descripción): entra en edición libremente, guarda con un
 * botón explícito, y se bloquea en modo lectura cuando la orden está en un
 * estado terminal. Los tres campos comparten este comportamiento al
 * completo para no desincronizarse — ver diagnosis-editor.tsx,
 * observations-editor.tsx y description-editor.tsx, que solo aportan sus
 * textos y su acción de guardado.
 */
export function LongTextFieldEditor({
  fieldId,
  label,
  initialValue,
  isTerminal,
  placeholder,
  saveButtonLabel,
  savingButtonLabel,
  successMessage,
  defaultErrorMessage,
  required = false,
  requiredErrorMessage,
  onSave,
}: LongTextFieldEditorProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue ?? "");
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setValue(event.target.value);
  }

  async function handleSave() {
    if (required && value.trim() === "") {
      toast.error(requiredErrorMessage ?? "Este campo no puede quedar vacío");
      return;
    }

    setIsSaving(true);
    const result = await onSave(value);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? defaultErrorMessage);
      return;
    }

    toast.success(successMessage);
    router.refresh();
  }

  const hasChanges = value !== (initialValue ?? "");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={fieldId}
        value={value}
        onChange={handleChange}
        disabled={isTerminal}
        rows={4}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30"
      />
      {!isTerminal && (
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving || !hasChanges}
          className="self-start"
        >
          {isSaving ? savingButtonLabel : saveButtonLabel}
        </Button>
      )}
    </div>
  );
}
