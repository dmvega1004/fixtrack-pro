import { IsIn, IsInt, IsString, MaxLength, Min } from 'class-validator';
import {
  ALLOWED_EQUIPMENT_FILE_MIME_TYPES,
  EQUIPMENT_FILE_CATEGORIES,
} from '../equipment-file.constants';

/**
 * Paso 1 de la subida: el navegador pide una URL firmada. Todo lo que llega
 * acá es DECLARADO por el cliente y solo sirve para rechazar rápido y
 * barato lo que ni vale la pena firmar — la verificación de verdad (tamaño
 * y tipo reales) ocurre en el paso de registro, contra Supabase.
 */
export class RequestUploadDto {
  @IsString()
  @MaxLength(255, { message: 'El nombre del archivo es demasiado largo' })
  originalName: string;

  @IsIn([...ALLOWED_EQUIPMENT_FILE_MIME_TYPES], {
    message: 'Solo se admiten archivos PDF o imágenes (JPG, PNG, WEBP, HEIC)',
  })
  contentType: string;

  @IsInt({ message: 'sizeBytes debe ser un entero' })
  @Min(1, { message: 'El archivo está vacío' })
  sizeBytes: number;

  @IsIn([...EQUIPMENT_FILE_CATEGORIES], {
    message: 'Categoría de archivo no válida',
  })
  category: string;
}
