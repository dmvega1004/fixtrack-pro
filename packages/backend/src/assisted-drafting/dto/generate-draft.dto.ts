import { IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateDraftDto {
  /** Apuntes sueltos del técnico (escritos o dictados). */
  @IsString()
  @MinLength(10, { message: 'Escribe al menos una frase de apuntes' })
  @MaxLength(8000, { message: 'Los apuntes no pueden superar 8000 caracteres' })
  notes!: string;
}
