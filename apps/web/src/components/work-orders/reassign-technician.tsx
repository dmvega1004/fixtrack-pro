"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Technician } from "@/lib/api/users";
import { reassignTechnicianAction } from "@/app/(dashboard)/ordenes/[id]/actions";

const UNASSIGNED_VALUE = "";

interface ReassignTechnicianProps {
  orderId: string;
  technicians: Technician[];
  currentUserId: string | null;
  isTerminal: boolean;
}

export function ReassignTechnician({
  orderId,
  technicians,
  currentUserId,
  isTerminal,
}: ReassignTechnicianProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentUserId ?? UNASSIGNED_VALUE);
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelected(event.target.value);
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await reassignTechnicianAction(
      orderId,
      selected === UNASSIGNED_VALUE ? null : selected,
    );
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo reasignar la orden");
      setSelected(currentUserId ?? UNASSIGNED_VALUE);
      return;
    }

    toast.success("Técnico reasignado");
    router.refresh();
  }

  const hasChanges = selected !== (currentUserId ?? UNASSIGNED_VALUE);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="assignee" className="text-sm font-medium">
        Técnico asignado
      </label>
      <div className="flex items-center gap-2">
        <select
          id="assignee"
          value={selected}
          onChange={handleChange}
          disabled={isTerminal}
          className="h-9 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground disabled:opacity-50"
        >
          <option value={UNASSIGNED_VALUE}>Sin asignar</option>
          {technicians.map((technician) => (
            <option key={technician.id} value={technician.id}>
              {technician.name}
            </option>
          ))}
        </select>
        {!isTerminal && (
          <Button
            onClick={() => void handleSave()}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        )}
      </div>
    </div>
  );
}
