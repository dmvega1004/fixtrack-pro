"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { WorkOrderEquipment } from "@/lib/api/work-orders";
import type { Equipment } from "@/lib/api/equipments";
import { updateOrderEquipmentsAction } from "@/app/(dashboard)/ordenes/[id]/actions";

interface EquipmentSectionProps {
  orderId: string;
  clientName: string;
  /** Equipos actualmente vinculados a la orden (order.equipments). */
  equipments: WorkOrderEquipment[];
  /** Catálogo completo del cliente de la orden — solo se usa para agregar. */
  clientEquipments: Equipment[];
  canManage: boolean;
  isTerminal: boolean;
}

/**
 * Bloque de equipos en el encabezado de la orden. Lectura: 0 = "Servicio
 * locativo", 1 = bloque limpio (igual que antes), varios = lista compacta.
 * Edición (Admin/Coordinador, orden no cerrada): agregar/quitar aplica de
 * inmediato — el PATCH reemplaza el set completo, así que siempre se manda
 * la lista final resultante, nunca un delta.
 */
export function EquipmentSection({
  orderId,
  clientName,
  equipments,
  clientEquipments,
  canManage,
  isTerminal,
}: EquipmentSectionProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const linkedIds = new Set(equipments.map((equipment) => equipment.id));
  const addableEquipments = clientEquipments.filter(
    (equipment) => !linkedIds.has(equipment.id),
  );

  async function applyIds(nextIds: string[], pendingKey: string) {
    setPendingId(pendingKey);
    const result = await updateOrderEquipmentsAction(orderId, nextIds);
    setPendingId(null);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudieron actualizar los equipos");
      return;
    }

    toast.success("Equipos actualizados");
    router.refresh();
  }

  function handleRemove(equipmentId: string) {
    void applyIds(
      equipments.filter((equipment) => equipment.id !== equipmentId).map((equipment) => equipment.id),
      equipmentId,
    );
  }

  function handleAdd(equipmentId: string) {
    void applyIds([...equipments.map((equipment) => equipment.id), equipmentId], equipmentId);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-sm">
      {equipments.length === 0 ? (
        <>
          <span className="font-medium">{clientName}</span>
          <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Servicio locativo
          </span>
        </>
      ) : equipments.length === 1 ? (
        <>
          <Link
            href={`/equipos/${equipments[0].id}`}
            className="font-medium text-primary hover:underline"
          >
            {equipments[0].brand} {equipments[0].model}
          </Link>
          <span className="text-muted-foreground">{clientName}</span>
          {equipments[0].location && (
            <span className="text-xs text-muted-foreground">
              {equipments[0].location}
            </span>
          )}
          <span className="mt-1 text-xs text-muted-foreground">
            Código QR: {equipments[0].qrCode}
          </span>
        </>
      ) : (
        <>
          <span className="font-medium">{clientName}</span>
          <span className="text-xs text-muted-foreground">
            {equipments.length} equipos
          </span>
          <div className="mt-1 flex flex-col divide-y divide-border">
            {equipments.map((equipment) => (
              <Link
                key={equipment.id}
                href={`/equipos/${equipment.id}`}
                className="flex flex-col gap-0.5 py-2 text-sm first:pt-0 last:pb-0 hover:bg-muted/50"
              >
                <span className="font-medium text-primary">
                  {equipment.brand} {equipment.model}
                </span>
                {equipment.location && (
                  <span className="text-xs text-muted-foreground">
                    {equipment.location}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </>
      )}

      {canManage && !isTerminal && (
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
          {equipments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {equipments.map((equipment) => (
                <span
                  key={equipment.id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground"
                >
                  {equipment.brand} {equipment.model}
                  <button
                    type="button"
                    disabled={pendingId !== null}
                    onClick={() => handleRemove(equipment.id)}
                    aria-label={`Quitar ${equipment.brand} ${equipment.model}`}
                    className="rounded-full hover:bg-background disabled:opacity-50"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {addableEquipments.length > 0 ? (
            <select
              value=""
              disabled={pendingId !== null}
              onChange={(event) => {
                if (event.target.value) handleAdd(event.target.value);
              }}
              className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
            >
              <option value="">+ Agregar equipo del cliente...</option>
              {addableEquipments.map((equipment) => (
                <option key={equipment.id} value={equipment.id}>
                  {equipment.brand} {equipment.model}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-muted-foreground">
              {equipments.length === 0
                ? "Este cliente no tiene equipos registrados."
                : "Ya están todos los equipos de este cliente en la orden."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
