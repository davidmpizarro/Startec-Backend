import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { EstadoMatricula } from '@prisma/client';

export class ActualizarEstudianteDto {
  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsString()
  correoInstitucional?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEnum(EstadoMatricula)
  estadoMatricula?: EstadoMatricula;

  @IsOptional()
  @IsString()
  carreraCodigo?: string;

  @IsOptional()
  @IsString()
  seccionCodigo?: string;

  @IsOptional()
  @IsString()
  seccion?: string;

  @IsOptional()
  @IsBoolean()
  biometriaRegistrada?: boolean;

  @IsOptional()
  @IsBoolean()
  horarioLiberado?: boolean;
}
