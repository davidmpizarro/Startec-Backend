import { IsNotEmpty, IsString, IsOptional, Length } from 'class-validator';

export class PreAdmitirEstudianteDto {
  @IsString()
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @Length(8, 8, { message: 'El DNI debe contener exactamente 8 dígitos' })
  dni: string;

  @IsString()
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  nombres: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  apellidos: string;

  @IsOptional()
  @IsString()
  correoPersonal?: string;

  @IsOptional()
  @IsString()
  correoInstitucional?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  carreraCodigo?: string;

  @IsOptional()
  @IsString()
  carreraNombre?: string;

  @IsOptional()
  @IsString()
  seccionCodigo?: string;

  @IsOptional()
  @IsString()
  seccion?: string;
}
