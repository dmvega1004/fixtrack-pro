export function formatDate(date: string | Date, locale = "es-CO"): string {
  const value = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

/**
 * "05 ago 2026" — sin los conectores "de" ni el punto del mes abreviado de
 * formatDate ("05 de ago. de 2026"), para columnas angostas de tabla (ver
 * work-orders-list.tsx). No usar donde sí hay espacio para el formato
 * largo: detalle de la orden, documentos de impresión.
 */
export function formatDateCompact(date: string | Date, locale = "es-CO"): string {
  const value = typeof date === "string" ? new Date(date) : date;

  const parts = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(value);

  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return `${part("day")} ${part("month").replace(/\.$/, "")} ${part("year")}`;
}
