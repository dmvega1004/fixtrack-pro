/**
 * Semántica de FECHA sin hora (calendario), de punta a punta, para las
 * columnas @db.Date del plan de mantenimiento (Equipment.lastMaintenanceAt/
 * nextMaintenanceAt). TODA fecha de este módulo se representa como un
 * `Date` de JS anclado a MEDIANOCHE UTC (ej. "2026-09-12" → 2026-09-12T00:
 * 00:00.000Z) y TODA la aritmética se hace con los getters/setters UTC
 * (nunca los locales) — así el cálculo no depende de en qué zona horaria
 * corre el proceso de Node ni el navegador que lo lee. Mezclar esto con
 * `new Date(...)`/getters locales es exactamente lo que produce que "vence
 * el 12" se lea como "el 11" en una zona horaria negativa respecto a UTC.
 */

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Regex reutilizable en los DTO (@Matches) para exigir "YYYY-MM-DD" exacto. */
export { DATE_ONLY_PATTERN };

/**
 * Parsea "YYYY-MM-DD" a medianoche UTC de ese día calendario. Rechaza
 * cualquier otro formato (incluida una fecha-hora ISO completa) y
 * cualquier fecha que no exista en el calendario (ej. "2026-02-30").
 */
export function parseDateOnly(value: string): Date {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new Error(`Fecha inválida: "${value}". Se espera el formato YYYY-MM-DD.`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC normaliza desbordes (ej. mes 13 o día 32) en vez de fallar:
  // si al releer los componentes no coinciden con lo pedido, la fecha no
  // existe en el calendario.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Fecha inválida: "${value}" no existe en el calendario.`);
  }

  return date;
}

/** "YYYY-MM-DD" a partir de una fecha ancla-UTC — SIEMPRE con getters UTC. */
export function formatDateOnly(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Medianoche UTC del día calendario actual (servidor) — ancla para "hoy". */
export function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Cantidad de días en un mes/año dado (mes 0-based, como Date.UTC). */
function daysInMonth(year: number, month: number): number {
  // Día 0 del mes siguiente = último día de `month`.
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Suma `months` meses en UTC, con el mismo criterio de "fin de mes" que
 * usaría cualquier persona agendando una visita: si el día de origen no
 * existe en el mes de destino (ej. 31 de enero + 1 mes), se ajusta al
 * último día de ESE mes (28/29 de febrero), en vez de desbordar al mes
 * siguiente como hace `setUTCMonth` por defecto (31 de enero + 1 mes NO
 * puede convertirse en el 3 de marzo).
 */
export function addMonthsUTC(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth));

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Diferencia en días calendario ENTEROS entre dos fechas-ancla UTC (b − a). */
export function diffDaysUTC(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/** Suma (o resta, con `days` negativo) días de calendario en UTC. */
export function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}
