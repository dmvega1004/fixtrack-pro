/**
 * Debe reflejar MAX_PHOTOS_PER_EQUIPMENT en
 * packages/backend/src/equipment-photos/equipment-photos.service.ts.
 * Vive fuera de lib/api/equipment-photos.ts porque ese módulo usa
 * serverFetch (next/headers) y la sección de fotos es un componente cliente.
 */
export const MAX_PHOTOS_PER_EQUIPMENT = 10;
