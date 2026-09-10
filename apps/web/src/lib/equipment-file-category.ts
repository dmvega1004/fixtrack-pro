// Debe reflejar exactamente EQUIPMENT_FILE_CATEGORIES en
// packages/backend/src/equipment-files/equipment-file.constants.ts
//
// El orden de este arreglo es el orden en que se agrupan los archivos en la
// ficha del equipo: primero lo que un técnico busca en sitio (manuales),
// después lo administrativo.
//
// TODO — falta una categoría de CONFIGURACIÓN / PARÁMETROS (respaldo de la
// programación en control de acceso, CCTV, variadores). No se agrega ahora
// porque esos archivos son binarios y el arranque solo admite PDF e
// imágenes; ver la nota en el archivo del backend.
export const EQUIPMENT_FILE_CATEGORIES = [
  "USER_MANUAL",
  "PROGRAMMING_MANUAL",
  "DATASHEET",
  "CERTIFICATE",
  "DIAGRAM",
  "NAMEPLATE",
  "OTHER",
] as const;

export type EquipmentFileCategory = (typeof EQUIPMENT_FILE_CATEGORIES)[number];

export const EQUIPMENT_FILE_CATEGORY_LABELS: Record<
  EquipmentFileCategory,
  string
> = {
  USER_MANUAL: "Manual de usuario",
  PROGRAMMING_MANUAL: "Manual de programación / servicio",
  DATASHEET: "Ficha técnica",
  CERTIFICATE: "Certificación / garantía",
  DIAGRAM: "Plano / diagrama",
  NAMEPLATE: "Foto de placa de datos",
  OTHER: "Otro",
};

/** Etiqueta segura aunque llegue una categoría desconocida (dato viejo o de
 *  una versión más nueva del backend). */
export function equipmentFileCategoryLabel(category: string): string {
  return (
    EQUIPMENT_FILE_CATEGORY_LABELS[category as EquipmentFileCategory] ?? "Otro"
  );
}
