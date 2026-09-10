import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EQUIPMENT_FILE_CATEGORIES } from '../equipment-file.constants';

/**
 * Paso 2 de la subida: el archivo YA está en Supabase y el navegador pide
 * registrarlo. `storagePath` es el que devolvió el paso de firma; el
 * servicio lo verifica contra Supabase (existe, tamaño y tipo reales) y
 * comprueba que caiga bajo el prefijo de ESTA empresa y ESTE equipo antes
 * de crear la fila.
 */
export class RegisterEquipmentFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(400)
  storagePath: string;

  @IsString()
  @MinLength(1, { message: 'El nombre del archivo es obligatorio' })
  @MaxLength(255, { message: 'El nombre del archivo es demasiado largo' })
  originalName: string;

  @IsIn([...EQUIPMENT_FILE_CATEGORIES], {
    message: 'Categoría de archivo no válida',
  })
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'La descripción no puede pasar de 500 caracteres',
  })
  description?: string;
}
