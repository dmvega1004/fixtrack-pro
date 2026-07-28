export function formatDate(date: string | Date, locale = "es-CO"): string {
  const value = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}
