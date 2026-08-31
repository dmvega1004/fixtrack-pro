import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateRetentionDto } from './create-retention.dto';

export class UpdateRetentionDto extends PartialType(CreateRetentionDto) {
  /**
   * Desactivarla NO afecta las órdenes que ya la tienen aplicada (las
   * líneas de WorkOrderRetention son fotografías independientes) — solo
   * deja de ofrecerse para selecciones nuevas.
   */
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
