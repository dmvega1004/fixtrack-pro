/**
 * "2,4 MB" — tamaño de archivo legible a partir de bytes. Para la lista de
 * archivos de equipo (manuales, certificaciones). Base 1024, un decimal
 * desde KB, sin decimales en bytes.
 */
export function formatFileSize(bytes: number, locale = "es-CO"): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(value);

  return `${rounded} ${units[unitIndex]}`;
}
