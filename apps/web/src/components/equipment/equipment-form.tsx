"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboSelect } from "@/components/work-orders/combo-select";
import { EQUIPMENT_STATUS_LABELS } from "./equipment-status-badge";
import type { Client } from "@/lib/api/clients";
import type { Equipment, EquipmentStatus } from "@/lib/api/equipments";
import {
  createEquipmentAction,
  updateEquipmentAction,
} from "@/app/(dashboard)/equipos/actions";

const EQUIPMENT_STATUSES = Object.keys(
  EQUIPMENT_STATUS_LABELS,
) as EquipmentStatus[];

interface EquipmentFormProps {
  mode: "create" | "edit";
  equipmentId?: string;
  clients: Client[];
  initial?: Equipment;
  /** Preselección desde /equipos/nuevo?cliente=id (ficha de un cliente). Sin efecto en modo edit. */
  initialClientId?: string;
}

export function EquipmentForm({
  mode,
  equipmentId,
  clients,
  initial,
  initialClientId,
}: EquipmentFormProps) {
  const router = useRouter();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    initial?.clientId ?? initialClientId ?? null,
  );
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [serialNumber, setSerialNumber] = useState(initial?.serialNumber ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [status, setStatus] = useState<EquipmentStatus>(
    initial?.status ?? "ACTIVE",
  );
  const [isSaving, setIsSaving] = useState(false);

  const clientComboItems = clients.map((client) => ({
    id: client.id,
    label: client.name,
    hint:
      [
        client.documentType && client.documentNumber
          ? `${client.documentType} ${client.documentNumber}`
          : null,
        client.phone,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
  }));

  const isValid =
    selectedClientId !== null &&
    brand.trim() !== "" &&
    model.trim() !== "" &&
    !isSaving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;

    setIsSaving(true);
    const dto = {
      brand: brand.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim() || undefined,
      location: location.trim() || undefined,
      clientId: selectedClientId!,
      ...(mode === "edit" ? { status } : {}),
    };

    const result =
      mode === "create"
        ? await createEquipmentAction(dto)
        : await updateEquipmentAction(equipmentId!, dto);
    setIsSaving(false);

    if (!result.ok || !result.id) {
      toast.error(result.message ?? "No se pudo guardar el equipo");
      return;
    }

    toast.success(mode === "create" ? "Equipo creado" : "Equipo actualizado");
    router.push(`/equipos/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ComboSelect
            items={clientComboItems}
            selectedId={selectedClientId}
            onSelect={setSelectedClientId}
            placeholder="Buscar cliente por nombre..."
            emptyMessage="No se encontraron clientes."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos del equipo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand">Marca *</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setBrand(event.target.value)
                }
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="model">Modelo *</Label>
              <Input
                id="model"
                value={model}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setModel(event.target.value)
                }
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="serialNumber">Número de serie</Label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setSerialNumber(event.target.value)
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              value={location}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setLocation(event.target.value)
              }
              placeholder="Ej. CC La Cuesta, Piedecuesta — Local AME2170 Americanino"
            />
          </div>

          {mode === "edit" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as EquipmentStatus)
                }
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
              >
                {EQUIPMENT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {EQUIPMENT_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              El código QR se genera automáticamente y el equipo queda en
              estado Activo.
            </p>
          )}
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={!isValid}
        className="w-full md:w-auto md:self-end"
      >
        {isSaving
          ? "Guardando..."
          : mode === "create"
            ? "Crear equipo"
            : "Guardar cambios"}
      </Button>
    </form>
  );
}
