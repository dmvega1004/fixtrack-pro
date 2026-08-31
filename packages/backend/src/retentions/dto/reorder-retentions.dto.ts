import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReorderRetentionsDto {
  /** Todas las retenciones de la empresa, en el nuevo orden — reemplazo completo. */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique({ message: 'ids no puede tener retenciones repetidas' })
  @IsUUID('4', { each: true, message: 'Cada id debe ser un UUID válido' })
  ids: string[];
}
