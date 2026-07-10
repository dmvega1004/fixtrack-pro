import { PartialType } from '@nestjs/mapped-types';
import { CreateSparePartDto } from './create-spare-part.dto';

/** Todos los campos de creación, opcionales, heredando sus validaciones. */
export class UpdateSparePartDto extends PartialType(CreateSparePartDto) {}
