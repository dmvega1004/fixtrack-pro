"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SERVICE_TYPE_LABELS,
  type ServiceType,
} from "@/components/shared/service-type-badge";
import { changeServiceTypeAction } from "@/app/(dashboard)/ordenes/[id]/actions";

const SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[];

interface ServiceTypeEditorProps {
  orderId: string;
  currentServiceType: ServiceType;
  isTerminal: boolean;
}

export function ServiceTypeEditor({
  orderId,
  currentServiceType,
  isTerminal,
}: ServiceTypeEditorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<ServiceType>(currentServiceType);
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelected(event.target.value as ServiceType);
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await changeServiceTypeAction(orderId, selected);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo cambiar el tipo de servicio");
      setSelected(currentServiceType);
      return;
    }

    toast.success("Tipo de servicio actualizado");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="serviceType" className="text-sm font-medium">
        Tipo de servicio
      </label>
      <div className="flex items-center gap-2">
        <select
          id="serviceType"
          value={selected}
          onChange={handleChange}
          disabled={isTerminal}
          className="h-9 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground disabled:opacity-50"
        >
          {SERVICE_TYPES.map((serviceType) => (
            <option key={serviceType} value={serviceType}>
              {SERVICE_TYPE_LABELS[serviceType]}
            </option>
          ))}
        </select>
        {!isTerminal && (
          <Button
            onClick={() => void handleSave()}
            disabled={isSaving || selected === currentServiceType}
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        )}
      </div>
    </div>
  );
}
