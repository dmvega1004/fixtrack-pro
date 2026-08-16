"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EquipmentCheckboxList,
  type EquipmentCheckboxItem,
} from "@/components/work-orders/equipment-checkbox-list";
import { todayDateInputValue } from "@/lib/format/date-only";
import { activateMaintenanceBatchAction } from "@/app/(dashboard)/clientes/actions";
import type { Equipment } from "@/lib/api/equipments";

const INTERVAL_PRESETS = [3, 4, 6, 12] as const;
const CUSTOM_OPTION = "custom";

interface ActivateMaintenanceDialogProps {
  clientId: string;
  equipments: Equipment[];
}

/**
 * Diálogo de la ficha del cliente: activa el plan de mantenimiento de
 * VARIOS equipos con el mismo intervalo y fecha base en una sola operación
 * (POST /equipments/maintenance/activate-batch). Es lo que hace manejable
 * un cliente con ocho equipos — sin esto serían ocho visitas a ocho fichas.
 */
export function ActivateMaintenanceDialog({
  clientId,
  equipments,
}: ActivateMaintenanceDialogProps) {
  const router = useRouter();
  const dateInputId = useId();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [intervalOption, setIntervalOption] = useState<string>("3");
  const [customInterval, setCustomInterval] = useState("");
  const [lastMaintenanceAt, setLastMaintenanceAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const checkboxItems: EquipmentCheckboxItem[] = equipments.map((equipment) => ({
    id: equipment.id,
    label: `${equipment.brand} ${equipment.model}`,
    hint: equipment.serialNumber ?? undefined,
  }));

  const resolvedInterval =
    intervalOption === CUSTOM_OPTION ? Number(customInterval) : Number(intervalOption);
  const isIntervalValid =
    Number.isInteger(resolvedInterval) && resolvedInterval >= 1 && resolvedInterval <= 60;
  const isValid = selectedIds.length > 0 && isIntervalValid && lastMaintenanceAt !== "";

  function toggleEquipment(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id],
    );
  }

  function resetForm() {
    setSelectedIds([]);
    setIntervalOption("3");
    setCustomInterval("");
    setLastMaintenanceAt("");
  }

  function handleOpenChange(next: boolean) {
    if (isSaving) return;
    setOpen(next);
    if (!next) resetForm();
  }

  async function handleSubmit() {
    if (!isValid) return;

    setIsSaving(true);
    const result = await activateMaintenanceBatchAction({
      clientId,
      equipmentIds: selectedIds,
      maintenanceIntervalMonths: resolvedInterval,
      lastMaintenanceAt,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo activar el plan de mantenimiento");
      return;
    }

    toast.success(
      `Plan de mantenimiento activado para ${result.updated} equipo${result.updated === 1 ? "" : "s"}`,
    );
    setOpen(false);
    resetForm();
    router.refresh();
  }

  if (equipments.length === 0) return null;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarClock className="size-4" />
        Activar plan de mantenimiento
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activar plan de mantenimiento</DialogTitle>
          <DialogDescription>
            Selecciona los equipos, el intervalo y la fecha del último
            mantenimiento — se aplican a todos los seleccionados.
          </DialogDescription>
        </DialogHeader>

        <EquipmentCheckboxList
          items={checkboxItems}
          selectedIds={selectedIds}
          onToggle={toggleEquipment}
          placeholder="Buscar equipo por marca o modelo..."
          emptyMessage="No se encontraron equipos."
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="batchInterval">Periodicidad</Label>
            <select
              id="batchInterval"
              value={intervalOption}
              onChange={(event) => setIntervalOption(event.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
            >
              {INTERVAL_PRESETS.map((months) => (
                <option key={months} value={months}>
                  Cada {months} meses
                </option>
              ))}
              <option value={CUSTOM_OPTION}>Otro...</option>
            </select>
          </div>
          {intervalOption === CUSTOM_OPTION && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="batchIntervalCustom">Meses (1-60)</Label>
              <Input
                id="batchIntervalCustom"
                type="number"
                min={1}
                max={60}
                value={customInterval}
                onChange={(event) => setCustomInterval(event.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={dateInputId}>Fecha del último mantenimiento</Label>
          <Input
            id={dateInputId}
            type="date"
            max={todayDateInputValue()}
            value={lastMaintenanceAt}
            onChange={(event) => setLastMaintenanceAt(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Puede ser anterior a que estos equipos entraran al sistema.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={!isValid || isSaving}>
            {isSaving
              ? "Activando..."
              : `Activar para ${selectedIds.length} equipo${selectedIds.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  );
}
