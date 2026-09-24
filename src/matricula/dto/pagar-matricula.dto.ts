import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PagarMatriculaDto {
  @IsOptional()
  @IsString()
  estudianteId?: string;

  @IsOptional()
  @IsString()
  dni?: string;

  @IsNumber({}, { message: 'El monto debe ser un valor numérico' })
  @Type(() => Number)
  monto: number;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsString()
  concepto?: string;

  @IsOptional()
  @IsString()
  transaccionId?: string;

  @IsOptional()
  @IsString()
  numeroTarjeta?: string;

  @IsOptional()
  @IsString()
  titular?: string;
}
