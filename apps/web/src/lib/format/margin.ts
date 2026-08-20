export type MarginTone = "green" | "amber" | "red" | "neutral";

/** Bajo este umbral el margen es ajustado (ámbar); por debajo de 0 es rojo. */
const AMBER_THRESHOLD = 30;

/**
 * Semáforo del porcentaje de margen bruto de un trabajo. `null` (income 0,
 * sin dividir por cero) cae en "neutral" — se muestra como guion, nunca
 * como rojo (no hubo pérdida, simplemente no hay base para calcular).
 */
export function marginTone(marginPercent: number | null): MarginTone {
  if (marginPercent === null) return "neutral";
  if (marginPercent < 0) return "red";
  if (marginPercent < AMBER_THRESHOLD) return "amber";
  return "green";
}

/** "42,3%" o "—" si marginPercent es null. */
export function formatMarginPercent(marginPercent: number | null): string {
  if (marginPercent === null) return "—";
  return `${marginPercent.toLocaleString("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
}
