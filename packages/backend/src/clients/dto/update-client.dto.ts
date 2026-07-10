import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';

/**
 * Todos los campos de CreateClientDto, pero opcionales.
 * PartialType hereda también los decoradores de validación:
 * si envías `email`, se valida como email; si no lo envías, se omite.
 */
export class UpdateClientDto extends PartialType(CreateClientDto) {}
