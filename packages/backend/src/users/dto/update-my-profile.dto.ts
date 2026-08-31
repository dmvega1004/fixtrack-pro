import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Perfil → "Mi firma": lo único que cualquier usuario puede editar de SÍ
 * MISMO fuera de su contraseña (ver AuthController.changePassword). El
 * número de documento se congela sobre la orden al capturar la firma
 * como técnico (ver WorkOrder.technicianDocument) — por eso vive acá y no
 * en UpdateUserDto (ADMIN-only, edita a OTROS usuarios).
 */
export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  documentNumber?: string;
}
