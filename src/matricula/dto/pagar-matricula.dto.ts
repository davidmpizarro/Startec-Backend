import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class PagarMatriculaDto {
  @IsNumber({}, { message: 'El monto debe ser un valor numérico' })
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  @IsNotEmpty({ message: 'El monto es obligatorio' })
  monto: number;

  @IsString()
  @IsOptional()
  moneda?: string;

  @IsString()
  @IsOptional()
  concepto?: string;

  @IsString()
  @IsOptional()
  transaccionId?: string;
}
