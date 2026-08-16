"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/lib/api/equipments";
import {
  daysUntilDateOnly,
  formatDateOnly,
  toDateInputValue,
  todayDateInputValue,
} from "@/lib/format/date-only";
import {
  MAINTENANCE_TONE_STYLES,
  maintenanceDaysLabel,
  maintenanceTone,
} from "@/lib/maintenance";
import { updateEquipmentAction } from "@/app/(dashboard)/equipos/actions";

const INTERVAL_PRESETS = [3, 4, 6, 12] as const;
const CUSTOM_OPTION = "custom";

type MaintenanceFields = Pick<
  Equipment,
  "maintenanceEnabled" | "maintenanceIntervalMonths" | "lastMaintenanceAt" | "nextMaintenanceAt"
>;

interface MaintenancePlanSectionProps {
  equipmentId: string;
  equipment: MaintenanceFields;
  /** ADMIN/COORDINATOR: puede configurar el plan. TECHNICIAN: solo lectura. */
  canManage: boolean;
}

/** Interruptor simple: sin librería externa, mismo criterio del resto de la UI (solo Tailwind). */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

/** Verde &gt;30 días, ámbar ≤30, rojo ya vencido (con los días de retraso). */
function MaintenanceSemaphore({ nextMaintenanceAt }: { nextMaintenanceAt: string }) {
  const days = daysUntilDateOnly(nextMaintenanceAt);
  const tone = maintenanceTone(days);

  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          MAINTENANCE_TONE_STYLES[tone],
        )}
      >
        {maintenanceDaysLabel(days)}
      </span>
      <span className="text-xs text-muted-foreground">
        Próximo mantenimiento: {formatDateOnly(nextMaintenanceAt)}
      </span>
    </div>
  );
}

export function MaintenancePlanSection({
  equipmentId,
  equipment,
  canManage,
}: MaintenancePlanSectionProps) {
  const router = useRouter();
  const isPreset = (value: number | null): value is (typeof INTERVAL_PRESETS)[number] =>
    value !== null && (INTERVAL_PRESETS as readonly number[]).includes(value);

  const [enabled, setEnabled] = useState(equipment.maintenanceEnabled);
  const [intervalOption, setIntervalOption] = useState<string>(() =>
    isPreset(equipment.maintenanceIntervalMonths)
      ? String(equipment.maintenanceIntervalMonths)
      : equipment.maintenanceIntervalMonths
        ? CUSTOM_OPTION
        : "3",
  );
  const [customInterval, setCustomInterval] = useState(
    equipment.maintenanceIntervalMonths && !isPreset(equipment.maintenanceIntervalMonths)
      ? String(equipment.maintenanceIntervalMonths)
      : "",
  );
  const [lastMaintenanceAt, setLastMaintenanceAt] = useState(
    equipment.lastMaintenanceAt ? toDateInputValue(equipment.lastMaintenanceAt) : "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const resolvedInterval =
    intervalOption === CUSTOM_OPTION ? Number(customInterval) : Number(intervalOption);
  const isIntervalValid =
    Number.isInteger(resolvedInterval) && resolvedInterval >= 1 && resolvedInterval <= 60;
  const isValid = !enabled || (isIntervalValid && lastMaintenanceAt !== "");

  const initialLastMaintenanceAt = equipment.lastMaintenanceAt
    ? toDateInputValue(equipment.lastMaintenanceAt)
    : "";
  const hasChanges =
    enabled !== equipment.maintenanceEnabled ||
    (enabled &&
      (resolvedInterval !== equipment.maintenanceIntervalMonths ||
        lastMaintenanceAt !== initialLastMaintenanceAt));

  async function handleSave() {
    if (!isValid || !hasChanges) return;

    setIsSaving(true);
    const result = await updateEquipmentAction(
      equipmentId,
      enabled
        ? {
            maintenanceEnabled: true,
            maintenanceIntervalMonths: resolvedInterval,
            lastMaintenanceAt,
          }
        : { maintenanceEnabled: false },
    );
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo guardar el plan de mantenimiento");
      return;
    }

    toast.success("Plan de mantenimiento actualizado");
    router.refresh();
  }

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan de mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          {equipment.maintenanceEnabled && equipment.nextMaintenanceAt ? (
            <MaintenanceSemaphore nextMaintenanceAt={equipment.nextMaintenanceAt} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Este equipo no tiene un plan de mantenimiento activo.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan de mantenimiento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {equipment.maintenanceEnabled && equipment.nextMaintenanceAt && (
          <MaintenanceSemaphore nextMaintenanceAt={equipment.nextMaintenanceAt} />
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Plan activo</span>
            <span className="text-xs text-muted-foreground">
              Vigila cuándo toca el próximo mantenimiento de este equipo.
            </span>
          </div>
          <Toggle checked={enabled} onChange={setEnabled} disabled={isSaving} />
        </div>

        {enabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="maintenanceInterval">Periodicidad</Label>
                <select
                  id="maintenanceInterval"
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
                  <Label htmlFor="maintenanceIntervalCustom">Meses (1-60)</Label>
                  <Input
                    id="maintenanceIntervalCustom"
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
              <Label htmlFor="lastMaintenanceAt">Fecha del último mantenimiento</Label>
              <Input
                id="lastMaintenanceAt"
                type="date"
                max={todayDateInputValue()}
                value={lastMaintenanceAt}
                onChange={(event) => setLastMaintenanceAt(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Puede ser anterior a que este equipo entrara al sistema — ej. un
                cliente con años de mantenimiento previo.
              </p>
            </div>
          </>
        )}

        <Button
          onClick={() => void handleSave()}
          disabled={!isValid || !hasChanges || isSaving}
          className="self-start"
        >
          {isSaving ? "Guardando..." : "Guardar plan"}
        </Button>
      </CardContent>
    </Card>
  );
}
