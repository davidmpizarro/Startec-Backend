import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerarLinkPagoDto {
  @IsOptional()
  @IsString()
  estudianteId?: string;

  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El monto debe ser un valor numérico' })
  @Type(() => Number)
  monto?: number;

  @IsOptional()
  @IsString()
  concepto?: string;
}
