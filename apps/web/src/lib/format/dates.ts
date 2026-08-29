/**
 * Estas funciones formatean INSTANTES (createdAt, billedAt, paidAt...) y
 * corren tanto en el servidor (Server Components, UTC en producción) como
 * en el navegador — sin un timeZone explícito, Intl usa el del entorno de
 * ejecución, no el del negocio. El negocio opera en Colombia (UTC-5): sin
 * esto, una orden cerrada a las 8:00 p.m. hora de Bogotá se imprime con la
 * hora corrida Y con la fecha del día siguiente (ver formatActivityDate en
 * el backend para el mismo problema del lado del servidor).
 *
 * El día que la plataforma se venda fuera de Colombia, esto debe volverse
 * una configuración por empresa (Company.timeZone o similar) — hoy
 * agregar esa complejidad no tiene beneficio: un solo tenant, un solo país.
 *
 * NO aplica a los campos @db.Date (fechas de mantenimiento, validez de
 * cotizaciones): esos son fechas de calendario sin hora y se manejan en
 * ./date-only.ts, siempre en UTC explícito — nunca con este timeZone.
 */
export const BOGOTA_TIME_ZONE = "America/Bogota";

export function formatDate(date: string | Date, locale = "es-CO"): string {
  const value = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: BOGOTA_TIME_ZONE,
  }).format(value);
}

/** "02:45 p. m." — ver formato-cliente-document.tsx (hora de cierre de la orden). */
export function formatTime(date: string | Date, locale = "es-CO"): string {
  const value = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BOGOTA_TIME_ZONE,
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
    timeZone: BOGOTA_TIME_ZONE,
  }).formatToParts(value);

  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return `${part("day")} ${part("month").replace(/\.$/, "")} ${part("year")}`;
}

/**
 * "2026-08-29" — día calendario de `date` en la zona horaria de negocio
 * (America/Bogota), para agrupar/comparar por día (ver activity-tab.tsx:
 * "Hoy"/"Ayer"). El truco de locale "en-CA" es que Intl la formatea ya en
 * orden YYYY-MM-DD, sin tener que armar el string a mano con getters.
 */
export function bogotaDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
