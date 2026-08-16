export type MaintenanceTone = "green" | "amber" | "red";

export const MAINTENANCE_TONE_STYLES: Record<MaintenanceTone, string> = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};

/** Verde &gt;30 días, ámbar ≤30 días, rojo ya vencido — mismo criterio en toda la app. */
export function maintenanceTone(daysRemaining: number): MaintenanceTone {
  if (daysRemaining < 0) return "red";
  if (daysRemaining <= 30) return "amber";
  return "green";
}

export function maintenanceDaysLabel(daysRemaining: number): string {
  if (daysRemaining < 0) {
    const overdue = Math.abs(daysRemaining);
    return `Venció hace ${overdue} día${overdue === 1 ? "" : "s"}`;
  }
  if (daysRemaining === 0) return "Vence hoy";
  return `Faltan ${daysRemaining} día${daysRemaining === 1 ? "" : "s"}`;
}
