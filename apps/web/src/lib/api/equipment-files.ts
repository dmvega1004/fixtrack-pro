// Tipos y límites del módulo de archivos de equipo. Los archivos NO pasan
// por el servidor de Next (las funciones de Vercel cortan el cuerpo en
// ~4.5 MB y un manual pesa mucho más): el navegador los sube DIRECTO a
// Supabase con una URL firmada que emite el backend, y solo después se
// registran. Ver components/equipment/equipment-files-section.tsx.

// Debe reflejar EquipmentFileView en
// packages/backend/src/equipment-files/equipment-files.service.ts
export interface EquipmentFile {
  id: string;
  equipmentId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  description: string | null;
  uploadedBy: { id: string; name: string } | null;
  createdAt: string;
}

// Debe reflejar SignedUploadResponse en el mismo archivo del backend.
export interface SignedUpload {
  uploadUrl: string;
  storagePath: string;
}

/**
 * Debe reflejar MAX_EQUIPMENT_FILE_BYTES en
 * packages/backend/src/equipment-files/equipment-file.constants.ts.
 * Validación de cortesía en el navegador — la de verdad la hace el backend
 * contra el tamaño real que reporta Supabase.
 */
export const MAX_EQUIPMENT_FILE_BYTES = 45 * 1024 * 1024;

// Debe reflejar ALLOWED_EQUIPMENT_FILE_MIME_TYPES del backend.
export const ALLOWED_EQUIPMENT_FILE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

/** Para el atributo `accept` del <input type="file">. */
export const EQUIPMENT_FILE_ACCEPT = ".pdf,image/*";
