// Debe reflejar exactamente REPORT_FORMAT_SOURCES en
// packages/backend/src/clients/dto/create-client.dto.ts
//
// Vive en su propio módulo (sin dependencias de servidor) para que
// componentes "use client" como ClientForm puedan importar el array/tipo
// sin arrastrar lib/api/clients.ts -> server-fetch.ts -> next/headers al
// bundle del navegador (eso rompe el build: "next/headers" solo es válido
// en Server Components).
export const REPORT_FORMAT_SOURCES = [
  "DESCRIPTION",
  "DIAGNOSIS",
  "OBSERVATIONS",
  "EMPTY",
] as const;
export type ReportFormatSource = (typeof REPORT_FORMAT_SOURCES)[number];

export const REPORT_FORMAT_SOURCE_LABELS: Record<ReportFormatSource, string> = {
  DESCRIPTION: "Descripción del problema",
  DIAGNOSIS: "Diagnóstico",
  OBSERVATIONS: "Observaciones / notas del servicio",
  EMPTY: "En blanco (para llenar a mano)",
};
