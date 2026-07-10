import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class AddWorkOrderPartDto {
  @IsUUID('4', { message: 'sparePartId debe ser un UUID válido' })
  sparePartId: string;

  @IsInt()
  @Min(1, { message: 'La cantidad mínima es 1' })
  @Max(9999)
  quantity: number;
}
