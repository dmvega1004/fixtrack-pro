import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/**
 * Bloque "Firmas" (pestaña Detalles). technicianName/technicianDocument/
 * technicianRole NO viajan acá: se congelan del PERFIL/rol del usuario
 * autenticado al capturar (ver WorkOrderSignaturesService.save) — nunca
 * texto libre del cliente, o cualquiera podría firmar "a nombre de" otro
 * técnico. receiverName/receiverDocument/receiverRole/receiverCompany sí
 * son texto libre: quien recibe no tiene cuenta en el sistema.
 *
 * Los seis campos son individualmente opcionales — el frontend solo
 * habilita "Guardar firmas" cuando los dos lados están completos ("un
 * botón que guarda ambas"), pero el backend acepta un lado a la vez para
 * poder "volver a firmar" solo uno sin reenviar el otro.
 */
export class SaveWorkOrderSignaturesDto {
  @IsOptional()
  @IsUrl({}, { message: 'technicianSignatureUrl debe ser una URL válida' })
  technicianSignatureUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  receiverName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  receiverDocument?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  receiverRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  receiverCompany?: string;

  @IsOptional()
  @IsUrl({}, { message: 'receiverSignatureUrl debe ser una URL válida' })
  receiverSignatureUrl?: string;
}
