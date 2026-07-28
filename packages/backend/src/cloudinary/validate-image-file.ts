import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from './image-upload.constants';

/** Compartido por AttachmentsService (fotos) y CompanyService (logo). */
export function validateImageFile(
  file: Express.Multer.File | undefined,
): asserts file is Express.Multer.File {
  if (!file) {
    throw new BadRequestException('Debes adjuntar un archivo de imagen');
  }

  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      file.mimetype as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
    )
  ) {
    throw new BadRequestException(
      'Formato no soportado: solo se admiten imágenes JPEG, PNG, WEBP o HEIC',
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new BadRequestException(
      'La imagen supera el tamaño máximo permitido (10MB)',
    );
  }
}
