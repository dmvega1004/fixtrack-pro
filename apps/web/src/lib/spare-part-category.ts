// Debe reflejar exactamente SPARE_PART_CATEGORIES en
// packages/backend/src/spare-parts/dto/create-spare-part.dto.ts
export const SPARE_PART_CATEGORIES = [
  "REPUESTO",
  "EQUIPO",
  "MATERIAL",
  "CONSUMIBLE",
] as const;
export type SparePartCategory = (typeof SPARE_PART_CATEGORIES)[number];

export const SPARE_PART_CATEGORY_LABELS: Record<SparePartCategory, string> = {
  REPUESTO: "Repuesto",
  EQUIPO: "Equipo",
  MATERIAL: "Material",
  CONSUMIBLE: "Consumible",
};
