"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { findMissingInfoMarkers } from "@/lib/assisted-draft";
import { cn } from "@/lib/utils";
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
  const isOnline = useOnlineStatus();
  const [value, setValue] = useState(initialValue ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // `initialValue` puede llegar en null/vacío en el primer render y
  // corregirse un instante después (la mezcla de cambios pendientes de la
  // cola resuelve async, ver hooks/use-synced-order.ts) — useState(initialValue)
  // solo lee el argumento en el montaje, así que sin este ajuste el campo
  // se queda pegado en ese primer valor para siempre, así el técnico haya
  // escrito y guardado algo hace rato. Patrón oficial de React para
  // "ajustar estado cuando cambia una prop" (react.dev): solo resincroniza
  // si el técnico no diverge todavía de lo último sincronizado — una
  // edición en curso nunca se pisa.
  const [syncedInitialValue, setSyncedInitialValue] = useState(initialValue);
  if (initialValue !== syncedInitialValue && value === (syncedInitialValue ?? "")) {
    setSyncedInitialValue(initialValue);
    setValue(initialValue ?? "");
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setValue(event.target.value);
  }

  // Marcas [FALTA: …] de la redacción asistida: mientras quede una, NO se
  // puede guardar — ni con señal ni sin ella (este editor es el único
  // camino de escritura de los cuatro campos). El backend las rechaza
  // también; esto es para que el técnico lo vea antes de intentarlo.
  const missingMarkers = findMissingInfoMarkers(value);

  async function handleSave() {
    if (missingMarkers.length > 0) return;
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
    // Sin señal, no hay nada que refrescar: `onSave` guardó en la cola
    // local, no en el servidor, y la vista offline ya se actualiza sola al
    // reaccionar al store de la cola (ver hooks/use-synced-order.ts). Un
    // router.refresh() acá solo dispararía una petición RSC condenada a
    // fallar por falta de señal.
    if (isOnline) router.refresh();
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
        aria-invalid={missingMarkers.length > 0}
        aria-describedby={missingMarkers.length > 0 ? `${fieldId}-missing` : undefined}
        className={cn(
          "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30",
          missingMarkers.length > 0 && "border-destructive ring-3 ring-destructive/30",
        )}
      />
      {missingMarkers.length > 0 && <MissingInfoAlert id={`${fieldId}-missing`} markers={missingMarkers} />}
      {!isTerminal && (
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving || !hasChanges || missingMarkers.length > 0}
          className="self-start"
        >
          {isSaving ? savingButtonLabel : saveButtonLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Aviso de marcas [FALTA: …] sin completar — también lo usa el panel de
 * redacción asistida. Rojo y con cada marca a la vista: si una llega al
 * PDF, la lee el cliente.
 */
export function MissingInfoAlert({ id, markers }: { id?: string; markers: string[] }) {
  return (
    <div
      id={id}
      role="alert"
      className="flex flex-col gap-1 rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive"
    >
      <p className="font-semibold">
        No se puede guardar: {markers.length === 1 ? "queda 1 dato" : `quedan ${markers.length} datos`} por completar.
      </p>
      <p>Completa o borra cada marca antes de guardar — si llega al informe, la ve el cliente.</p>
      <ul className="list-disc pl-5 font-mono text-xs">
        {markers.map((marker, index) => (
          <li key={index}>{marker}</li>
        ))}
      </ul>
    </div>
  );
}
