import { PartialType } from '@nestjs/mapped-types';
import { CreateEquipmentDto } from './create-equipment.dto';

/**
 * Todos los campos de CreateEquipmentDto, pero opcionales.
 * Nota: qrCode NO es editable — lo genera la base de datos y es
 * el identificador físico permanente de la etiqueta del equipo.
 */
export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {}
