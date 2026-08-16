/**
 * Semántica de FECHA sin hora para los campos @db.Date del plan de
 * mantenimiento (Equipment.lastMaintenanceAt/nextMaintenanceAt). El backend
 * los serializa como ISO ("2026-09-12T00:00:00.000Z", medianoche UTC del
 * día calendario) — estas funciones SIEMPRE leen el día calendario a partir
 * de esa cadena y operan en UTC, nunca con `new Date(iso)` +
 * getters/Intl locales: eso es justo lo que haría que "vence el 12" se
 * lea "el 11" en una zona horaria negativa respecto a UTC (ej. America/
 * Bogotá, UTC-5). No usar formatDate() de ./dates para estos campos.
 */

const DATE_ONLY_PREFIX = /^\d{4}-\d{2}-\d{2}/;

/** "YYYY-MM-DD" a partir de un ISO completo o ya de un date-only. */
function extractDateOnly(value: string): string {
  const match = value.match(DATE_ONLY_PREFIX);
  if (!match) {
    throw new Error(`No se pudo leer la fecha: "${value}"`);
  }
  return match[0];
}

/** Valor para `<input type="date">` — el propio "YYYY-MM-DD", sin pasar por Date. */
export function toDateInputValue(value: string): string {
  return extractDateOnly(value);
}

/** "12 sep. 2026" — SIEMPRE con timeZone UTC explícito, sin importar dónde corra. */
export function formatDateOnly(value: string, locale = "es-CO"): string {
  const [year, month, day] = extractDateOnly(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Días hasta `value` (date-only) desde HOY, en UTC — negativo = ya venció. */
export function daysUntilDateOnly(value: string): number {
  const [year, month, day] = extractDateOnly(value).split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return Math.round((target - today) / DAY_MS);
}

/** "YYYY-MM-DD" de hoy (UTC) — tope (`max`) de los `<input type="date">` de fecha base. */
export function todayDateInputValue(): string {
  const now = new Date();
  const y = String(now.getUTCFullYear()).padStart(4, "0");
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** `value` (date-only) + `days` días, en UTC — "YYYY-MM-DD". Usada para previsualizar fechas que aún no se han calculado (ej. validUntil de una cotización en borrador). */
export function addDaysToDateOnly(value: string, days: number): string {
  const [year, month, day] = extractDateOnly(value).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS);
  const y = String(shifted.getUTCFullYear()).padStart(4, "0");
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
