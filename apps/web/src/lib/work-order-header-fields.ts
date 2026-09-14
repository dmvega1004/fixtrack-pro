// Debe reflejar exactamente OPTIONAL_HEADER_FIELD_KEYS en
// packages/backend/src/company/dto/update-company.dto.ts
//
// Vive en su propio módulo (sin dependencias de servidor), mismo motivo
// que lib/report-format.ts: componentes "use client" (CompanyForm,
// HeaderFieldsPicker) lo importan sin arrastrar lib/api/company.ts ->
// server-fetch.ts -> next/headers al bundle del navegador.
//
// "Documento" (número de orden) y "Fecha" NO están acá: se pintan
// siempre, sin poder apagarse — identifican el documento. Esta lista es
// solo lo OPCIONAL del encabezado de la orden de trabajo.
export const OPTIONAL_HEADER_FIELD_KEYS = [
  "CLIENT",
  "TAX_ID",
  "STATUS",
  "SERVICE_TYPE",
  "PHONE",
  "EMAIL",
  "ADDRESS",
  "SERVICE_CITY",
  "SERVICE_TIME",
  "END_CLIENT",
  "TECHNICIAN",
] as const;

export type OptionalHeaderFieldKey = (typeof OPTIONAL_HEADER_FIELD_KEYS)[number];

export const HEADER_FIELD_LABELS: Record<OptionalHeaderFieldKey, string> = {
  CLIENT: "Cliente",
  TAX_ID: "NIT",
  STATUS: "Estado",
  SERVICE_TYPE: "Tipo de servicio",
  PHONE: "Teléfono",
  EMAIL: "Correo",
  ADDRESS: "Dirección",
  SERVICE_CITY: "Ciudad del servicio",
  SERVICE_TIME: "Hora del servicio",
  END_CLIENT: "Cliente final",
  TECHNICIAN: "Técnico asignado",
};

/**
 * Valores de ejemplo para la vista previa del panel — NO son los valores
 * reales del documento (esos salen de la orden). Solo ilustran cómo se ve
 * cada campo mientras se configura.
 */
export const HEADER_FIELD_PREVIEW_VALUES: Record<OptionalHeaderFieldKey, string> = {
  CLIENT: "Cliente de ejemplo",
  TAX_ID: "NIT 900.123.456-7",
  STATUS: "Entregada",
  SERVICE_TYPE: "Correctivo",
  PHONE: "300 000 0000",
  EMAIL: "contacto@ejemplo.com",
  ADDRESS: "Calle Ejemplo # 0-00",
  SERVICE_CITY: "Ciudad Ejemplo",
  SERVICE_TIME: "10:30 a. m.",
  END_CLIENT: "Cliente final de ejemplo",
  TECHNICIAN: "Técnico Ejemplo",
};

/**
 * Aproximación del set que se pinta HOY sin configurar nada — solo para
 * que la vista previa muestre algo representativo cuando el arreglo está
 * vacío. El código real (work-order-print-document.tsx) NO pasa por esta
 * lista en ese caso: sigue su propio bloque original sin tocar (Cliente
 * combinado con NIT en un solo valor, distinto del renderizado genérico
 * campo-por-campo que usan estas claves).
 */
export const DEFAULT_HEADER_FIELD_PREVIEW: OptionalHeaderFieldKey[] = [
  "CLIENT",
  "STATUS",
  "SERVICE_TYPE",
  "PHONE",
  "EMAIL",
  "ADDRESS",
];

export const SECTION_TITLE_STYLES = ["UNDERLINE", "FILLED"] as const;
export type SectionTitleStyle = (typeof SECTION_TITLE_STYLES)[number];
