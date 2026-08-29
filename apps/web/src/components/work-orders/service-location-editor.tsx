"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveServiceLocationAction } from "@/app/(dashboard)/ordenes/[id]/actions";

interface ServiceLocationEditorProps {
  orderId: string;
  initialEndClientName: string | null;
  initialServiceCity: string | null;
  /** Texto "HH:mm" o null — ver WorkOrder.serviceTime en el schema. */
  initialServiceTime: string | null;
  isTerminal: boolean;
}

/**
 * Cliente final, ciudad y hora del servicio: campos cortos, un solo
 * bloque, un solo botón de guardar (PATCH combinado — ver
 * saveServiceLocationAction). Los tres alimentan el formato de informe
 * propio del cliente. Mismo criterio de bloqueo en estado terminal que
 * Diagnóstico/Observaciones.
 */
export function ServiceLocationEditor({
  orderId,
  initialEndClientName,
  initialServiceCity,
  initialServiceTime,
  isTerminal,
}: ServiceLocationEditorProps) {
  const router = useRouter();
  const initialEndClient = initialEndClientName ?? "";
  const initialCity = initialServiceCity ?? "";
  const initialTime = initialServiceTime ?? "";
  const [endClientName, setEndClientName] = useState(initialEndClient);
  const [serviceCity, setServiceCity] = useState(initialCity);
  const [serviceTime, setServiceTime] = useState(initialTime);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    endClientName !== initialEndClient ||
    serviceCity !== initialCity ||
    serviceTime !== initialTime;

  async function handleSave() {
    setIsSaving(true);
    const result = await saveServiceLocationAction(orderId, {
      endClientName: endClientName.trim(),
      serviceCity: serviceCity.trim(),
      serviceTime,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo guardar");
      return;
    }

    toast.success("Datos del servicio guardados");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endClientName">Cliente final</Label>
          <Input
            id="endClientName"
            value={endClientName}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setEndClientName(event.target.value)
            }
            disabled={isTerminal}
            placeholder="Sin definir"
          />
          <p className="text-xs text-muted-foreground">
            Destinatario real del servicio cuando se trabaja como
            subcontratista. Aparece en el formato del cliente.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="serviceCity">Ciudad del servicio</Label>
          <Input
            id="serviceCity"
            value={serviceCity}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setServiceCity(event.target.value)
            }
            disabled={isTerminal}
            placeholder="Sin definir"
          />
          <p className="text-xs text-muted-foreground">
            Si se deja vacía se usa la ciudad registrada del cliente.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="serviceTime">Hora del servicio</Label>
          <Input
            id="serviceTime"
            type="time"
            value={serviceTime}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setServiceTime(event.target.value)
            }
            disabled={isTerminal}
          />
          <p className="text-xs text-muted-foreground">
            Si se deja vacía se usa la hora de cierre de la orden.
          </p>
        </div>
      </div>
      {!isTerminal && (
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving || !hasChanges}
          className="self-start"
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </Button>
      )}
    </div>
  );
}
