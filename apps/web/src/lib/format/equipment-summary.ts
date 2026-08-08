import type { WorkOrderEquipment } from "@/lib/api/work-orders";

/**
 * Resumen de una línea: 0 equipos = servicio locativo, 1 = "Marca Modelo",
 * varios = "N equipos" (el detalle de cada uno vive en la ficha de la orden).
 */
export function formatEquipmentSummary(equipments: WorkOrderEquipment[]): string {
  if (equipments.length === 0) return "Servicio locativo";
  if (equipments.length === 1) {
    return `${equipments[0].brand} ${equipments[0].model}`;
  }
  return `${equipments.length} equipos`;
}
