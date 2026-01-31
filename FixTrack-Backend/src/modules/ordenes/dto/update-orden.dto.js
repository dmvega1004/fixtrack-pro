const { IsString, IsOptional, IsEnum, IsNumber, IsArray } = require('class-validator');

class UpdateOrdenDto {
  // Paso 1 - Refinado
  @IsOptional()
  @IsString()
  tituloProblema;

  @IsOptional()
  @IsString()
  descripcionProblema;

  // Paso 2 - Diagnóstico y Ejecución
  @IsOptional()
  @IsString()
  diagnosticoTecnico;

  @IsOptional()
  @IsString()
  trabajoRealizado;

  @IsOptional()
  @IsNumber()
  horasManoObra;

  @IsOptional()
  @IsNumber()
  costoManoObra;

  @IsOptional()
  @IsArray()
  fotosUrl;

  // Paso 3 - Cierre
  @IsOptional()
  @IsEnum(['PENDIENTE', 'EN_PROCESO', 'TERMINADO'])
  estado;

  @IsOptional()
  @IsString()
  notasCliente;

  @IsOptional()
  @IsString()
  firmaClienteUrl;
}

module.exports = UpdateOrdenDto;