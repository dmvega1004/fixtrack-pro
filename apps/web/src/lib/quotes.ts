export type QuoteValidityTone = "green" | "amber" | "red";

export const QUOTE_VALIDITY_TONE_STYLES: Record<QuoteValidityTone, string> = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};

/** Verde &gt;7 días, ámbar ≤7 días, rojo ya venció. */
export function quoteValidityTone(daysRemaining: number): QuoteValidityTone {
  if (daysRemaining < 0) return "red";
  if (daysRemaining <= 7) return "amber";
  return "green";
}

export function quoteValidityLabel(daysRemaining: number): string {
  if (daysRemaining < 0) {
    const overdue = Math.abs(daysRemaining);
    return `Venció hace ${overdue} día${overdue === 1 ? "" : "s"}`;
  }
  if (daysRemaining === 0) return "Vence hoy";
  return `Faltan ${daysRemaining} día${daysRemaining === 1 ? "" : "s"}`;
}
