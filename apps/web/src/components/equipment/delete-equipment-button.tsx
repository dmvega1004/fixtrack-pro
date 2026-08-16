"use client";

import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { deleteEquipmentAction } from "@/app/(dashboard)/equipos/actions";

interface DeleteEquipmentButtonProps {
  equipmentId: string;
  /** Ej. "el equipo BFT PHOBOS BT A25 — Portón 1". */
  itemLabel: string;
}

/** Solo ADMIN puede ver este botón (candado de rol replicado en el componente padre y en el backend). */
export function DeleteEquipmentButton({ equipmentId, itemLabel }: DeleteEquipmentButtonProps) {
  return (
    <DeleteEntityButton
      itemLabel={itemLabel}
      triggerLabel="Eliminar equipo"
      onDelete={() => deleteEquipmentAction(equipmentId)}
      redirectTo="/equipos"
      successMessage="Equipo eliminado"
    />
  );
}
