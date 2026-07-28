"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveObservationsAction } from "@/app/(dashboard)/ordenes/[id]/actions";

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
  const router = useRouter();
  const [observations, setObservations] = useState(initialObservations ?? "");
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setObservations(event.target.value);
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await saveObservationsAction(orderId, observations);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo guardar las observaciones");
      return;
    }

    toast.success("Observaciones guardadas");
    router.refresh();
  }

  const hasChanges = observations !== (initialObservations ?? "");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="observations" className="text-sm font-medium">
        Observaciones del servicio
      </label>
      <textarea
        id="observations"
        value={observations}
        onChange={handleChange}
        disabled={isTerminal}
        rows={4}
        placeholder="Sin observaciones registradas"
        className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30"
      />
      {!isTerminal && (
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving || !hasChanges}
          className="self-start"
        >
          {isSaving ? "Guardando..." : "Guardar observaciones"}
        </Button>
      )}
    </div>
  );
}
