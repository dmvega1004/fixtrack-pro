import { ALLOWED_IMAGE_MIME_TYPES } from '../cloudinary/image-upload.constants';

/**
 * Categorías de un archivo de equipo. `EquipmentFile.category` es un String
 * validado contra esta lista en el DTO — NO un enum de BD: sumar una
 * categoría no debe requerir migración (mismo criterio que
 * Client.documentType y SparePart.category).
 *
 * TODO — categoría de CONFIGURACIÓN / PARÁMETROS: en control de acceso, CCTV
 * y variadores de frecuencia, el respaldo de la programación del equipo
 * (dump de parámetros, proyecto del software del fabricante) es lo más
 * valioso que se puede guardar. No se agrega ahora porque esos respaldos
 * son archivos binarios y el arranque solo admite PDF e imágenes (ver
 * ALLOWED_EQUIPMENT_FILE_MIME_TYPES). Es justo el caso que justifica haber
 * elegido String sobre enum: cuando se amplíen los tipos permitidos, esta
 * categoría entra sin tocar la base de datos.
 */
export const EQUIPMENT_FILE_CATEGORIES = [
  'USER_MANUAL',
  'PROGRAMMING_MANUAL',
  'DATASHEET',
  'CERTIFICATE',
  'DIAGRAM',
  'NAMEPLATE',
  'OTHER',
] as const;

export type EquipmentFileCategory = (typeof EQUIPMENT_FILE_CATEGORIES)[number];

/**
 * LÍMITE DE SUBIDA Y COSTO DEL PLAN — leer antes de subirlo.
 *
 * El almacenamiento vive en el plan GRATUITO de Supabase: 1 GB de
 * almacenamiento total y 5 GB de tráfico (egress) al mes. Con manuales de
 * fabricante de 20 a 30 MB, 1 GB son apenas unas pocas DECENAS de archivos
 * en toda la plataforma. Esta función tiene un costo que crece con el uso y
 * va a ser lo que empuje a contratar Supabase Pro (100 GB, ~USD 25/mes).
 * Cuando la limpieza de huérfanos (ver equipment-files.service.ts) y este
 * número dejen de alcanzar, esa es la señal.
 *
 * 45 MB por archivo: el plan gratuito de Supabase corta en 50 MB por
 * objeto; 45 deja margen para el sobre del multipart y aún cubre los
 * manuales que pasan de 30 MB. El bucket además debe tener su propio
 * `file_size_limit` configurado en el panel (defensa en profundidad).
 */
export const MAX_EQUIPMENT_FILE_BYTES = 45 * 1024 * 1024;

/**
 * Solo PDF e imágenes al arranque. Un manual, una ficha o una certificación
 * llegan en PDF; una foto de la placa de datos o una página escanada, como
 * imagen. Se excluyen a propósito Office (.docx/.xlsx), comprimidos y
 * cualquier binario: no se pueden previsualizar y amplían la superficie de
 * riesgo. El bucket de Supabase debe replicar esta lista en
 * `allowed_mime_types` (rechaza en la subida misma, antes del registro).
 */
export const ALLOWED_EQUIPMENT_FILE_MIME_TYPES = [
  'application/pdf',
  ...ALLOWED_IMAGE_MIME_TYPES,
] as const;

/** Vigencia del enlace de descarga firmado: suficiente para abrirlo, inútil
 *  si se filtra después. */
export const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;
