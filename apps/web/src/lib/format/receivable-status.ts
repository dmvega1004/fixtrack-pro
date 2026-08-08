export type ReceivableTone = "green" | "amber" | "red";

/** Últimos N días del plazo antes de vencer: se muestran en ámbar como aviso. */
const AMBER_WINDOW_DAYS = 5;

/** Semáforo de una cuenta por cobrar: verde dentro del plazo, ámbar en los últimos días, rojo vencida. */
export function receivableTone(
  isOverdue: boolean,
  daysSinceBilled: number,
  paymentTermDays: number,
): ReceivableTone {
  if (isOverdue) return "red";
  if (paymentTermDays - daysSinceBilled <= AMBER_WINDOW_DAYS) return "amber";
  return "green";
}
