"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveDiagnosisAction } from "@/app/(dashboard)/ordenes/[id]/actions";

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
  const router = useRouter();
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis ?? "");
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDiagnosis(event.target.value);
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await saveDiagnosisAction(orderId, diagnosis);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo guardar el diagnóstico");
      return;
    }

    toast.success("Diagnóstico guardado");
    router.refresh();
  }

  const hasChanges = diagnosis !== (initialDiagnosis ?? "");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="diagnosis" className="text-sm font-medium">
        Diagnóstico
      </label>
      <textarea
        id="diagnosis"
        value={diagnosis}
        onChange={handleChange}
        disabled={isTerminal}
        rows={4}
        placeholder="Sin diagnóstico registrado"
        className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30"
      />
      {!isTerminal && (
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving || !hasChanges}
          className="self-start"
        >
          {isSaving ? "Guardando..." : "Guardar diagnóstico"}
        </Button>
      )}
    </div>
  );
}
