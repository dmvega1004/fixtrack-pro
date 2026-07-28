// Debe reflejar exactamente DOCUMENT_TYPES en
// packages/backend/src/clients/dto/create-client.dto.ts
export const DOCUMENT_TYPES = ["CC", "NIT", "CE", "PASAPORTE"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CC: "Cédula de ciudadanía",
  NIT: "NIT",
  CE: "Cédula de extranjería",
  PASAPORTE: "Pasaporte",
};
