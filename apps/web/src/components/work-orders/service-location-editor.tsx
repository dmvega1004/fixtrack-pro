"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveServiceLocationAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { toDateInputValue, todayDateInputValue } from "@/lib/format/date-only";

interface ServiceLocationEditorProps {
  orderId: string;
  initialEndClientName: string | null;
  initialServiceCity: string | null;
  /** Texto "HH:mm" o null — ver WorkOrder.serviceTime en el schema. */
  initialServiceTime: string | null;
  /** ISO de un @db.Date o null — ver WorkOrder.serviceDate en el schema. */
  initialServiceDate: string | null;
  isTerminal: boolean;
}

/**
 * Cliente final, ciudad, fecha y hora del servicio: campos cortos, un solo
 * bloque, un solo botón de guardar (PATCH combinado — ver
 * saveServiceLocationAction). Los cuatro alimentan los documentos de la
 * orden. Mismo criterio de bloqueo en estado terminal que Diagnóstico/
 * Observaciones — ninguno de los cuatro es createdAt: esa fecha de
 * auditoría nunca se edita, ver WorkOrder.serviceDate en el schema.
 */
export function ServiceLocationEditor({
  orderId,
  initialEndClientName,
  initialServiceCity,
  initialServiceTime,
  initialServiceDate,
  isTerminal,
}: ServiceLocationEditorProps) {
  const router = useRouter();
  const initialEndClient = initialEndClientName ?? "";
  const initialCity = initialServiceCity ?? "";
  const initialTime = initialServiceTime ?? "";
  const initialDate = initialServiceDate ? toDateInputValue(initialServiceDate) : "";
  const [endClientName, setEndClientName] = useState(initialEndClient);
  const [serviceCity, setServiceCity] = useState(initialCity);
  const [serviceTime, setServiceTime] = useState(initialTime);
  const [serviceDate, setServiceDate] = useState(initialDate);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    endClientName !== initialEndClient ||
    serviceCity !== initialCity ||
    serviceTime !== initialTime ||
    serviceDate !== initialDate;

  async function handleSave() {
    setIsSaving(true);
    const result = await saveServiceLocationAction(orderId, {
      endClientName: endClientName.trim(),
      serviceCity: serviceCity.trim(),
      serviceTime,
      serviceDate,
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <Label htmlFor="serviceDate">Fecha del servicio</Label>
          <Input
            id="serviceDate"
            type="date"
            value={serviceDate}
            max={todayDateInputValue()}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setServiceDate(event.target.value)
            }
            disabled={isTerminal}
          />
          <p className="text-xs text-muted-foreground">
            Día en que se hizo el trabajo — no la fecha de creación de la
            orden. Sin definir, los documentos usan la fecha de creación.
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
