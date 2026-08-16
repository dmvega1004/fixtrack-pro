/** Mismo estilo que formatOrderNumber (OT-0004): "COT-0007". `null` = borrador (sin número todavía). */
export function formatQuoteNumber(n: number | null): string {
  if (n === null) return "Borrador";
  return `COT-${String(n).padStart(4, "0")}`;
}
