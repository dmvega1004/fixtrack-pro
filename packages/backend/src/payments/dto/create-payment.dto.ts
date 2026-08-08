import { PaymentMethod } from 'database';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePaymentDto {
  /** El servicio valida además que no exceda el saldo pendiente de la orden. */
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'amount debe ser un número con máximo 2 decimales' },
  )
  @IsPositive({ message: 'El monto del abono debe ser mayor que cero' })
  amount: number;

  @IsDateString({}, { message: 'paidAt debe ser una fecha válida (ISO 8601)' })
  paidAt: string;

  @IsEnum(PaymentMethod, {
    message: 'method debe ser CASH, TRANSFER, CHECK, CARD u OTHER',
  })
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
