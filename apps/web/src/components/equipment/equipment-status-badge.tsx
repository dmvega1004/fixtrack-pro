import { cn } from "@/lib/utils";
import type { EquipmentStatus } from "@/lib/api/equipments";

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  ACTIVE: "Activo",
  IN_REPAIR: "En reparación",
  RETIRED: "Retirado",
};

export const EQUIPMENT_STATUS_STYLES: Record<EquipmentStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  IN_REPAIR: "bg-amber-100 text-amber-800",
  RETIRED: "bg-gray-100 text-gray-600",
};

interface EquipmentStatusBadgeProps {
  status: EquipmentStatus;
}

export function EquipmentStatusBadge({ status }: EquipmentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        EQUIPMENT_STATUS_STYLES[status],
      )}
    >
      {EQUIPMENT_STATUS_LABELS[status]}
    </span>
  );
}
