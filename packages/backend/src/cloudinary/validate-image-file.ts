import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from './image-upload.constants';

/**
 * Compartido por AttachmentsService (fotos) y CompanyService (logo, firma).
 * `allowedMimeTypes` por defecto acepta lo mismo de siempre; la firma
 * digital lo restringe a PNG (exige transparencia real, no un JPEG con
 * fondo blanco).
 */
export function validateImageFile(
  file: Express.Multer.File | undefined,
  allowedMimeTypes: readonly string[] = ALLOWED_IMAGE_MIME_TYPES,
): asserts file is Express.Multer.File {
  if (!file) {
    throw new BadRequestException('Debes adjuntar un archivo de imagen');
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      allowedMimeTypes.length === 1 && allowedMimeTypes[0] === 'image/png'
        ? 'Formato no soportado: la firma debe ser una imagen PNG'
        : 'Formato no soportado: solo se admiten imágenes JPEG, PNG, WEBP o HEIC',
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new BadRequestException(
      'La imagen supera el tamaño máximo permitido (10MB)',
    );
  }
}
