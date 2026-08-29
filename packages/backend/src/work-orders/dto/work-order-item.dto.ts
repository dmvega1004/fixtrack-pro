import { IsNotEmpty, IsNumber, IsString, Min, MaxLength } from 'class-validator';

/**
 * Una línea de conceptos de una orden — SIEMPRE texto libre, mismo patrón
 * que QuoteItemInputDto. A diferencia de QuoteItem, no lleva sparePartId:
 * los conceptos de una orden describen un trabajo (instalación, cableado,
 * obra civil), no repuestos — el inventario ya tiene su propio bloque
 * (WorkOrderPart) con su propio flujo de descuento de stock.
 */
export class WorkOrderItemInputDto {
  @IsString()
  @IsNotEmpty({ message: 'La descripción del concepto es obligatoria' })
  @MaxLength(500)
  description: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'quantity debe ser un número con máximo 2 decimales' },
  )
  @Min(0.01, { message: 'quantity debe ser mayor que 0' })
  quantity: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'unitPrice debe ser un número con máximo 2 decimales' },
  )
  @Min(0)
  unitPrice: number;
}
