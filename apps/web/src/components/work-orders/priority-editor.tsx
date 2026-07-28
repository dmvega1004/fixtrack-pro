"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  PRIORITY_LABELS,
  type Priority,
} from "@/components/shared/priority-badge";
import { changePriorityAction } from "@/app/(dashboard)/ordenes/[id]/actions";

const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];

interface PriorityEditorProps {
  orderId: string;
  currentPriority: Priority;
  isTerminal: boolean;
}

export function PriorityEditor({
  orderId,
  currentPriority,
  isTerminal,
}: PriorityEditorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Priority>(currentPriority);
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelected(event.target.value as Priority);
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await changePriorityAction(orderId, selected);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo cambiar la prioridad");
      setSelected(currentPriority);
      return;
    }

    toast.success("Prioridad actualizada");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="priority" className="text-sm font-medium">
        Prioridad
      </label>
      <div className="flex items-center gap-2">
        <select
          id="priority"
          value={selected}
          onChange={handleChange}
          disabled={isTerminal}
          className="h-9 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground disabled:opacity-50"
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
        {!isTerminal && (
          <Button
            onClick={() => void handleSave()}
            disabled={isSaving || selected === currentPriority}
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        )}
      </div>
    </div>
  );
}
