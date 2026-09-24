import { IsNotEmpty, IsString, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportEstudianteDto {
  @IsString()
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
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
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  carreraCodigo?: string;

  @IsOptional()
  @IsString()
  carrera?: string;
}

export class ImportarEstudiantesPayloadDto {
  @IsArray({ message: 'Se esperaba un arreglo de estudiantes' })
  @ValidateNested({ each: true })
  @Type(() => ImportEstudianteDto)
  estudiantes: ImportEstudianteDto[];
}

export interface ImportarEstudiantesResultado {
  totalRecibidos: number;
  insertados: number;
  omitidosPorDuplicado: number;
  fallidos: number;
  errores: Array<{ fila: number; motivo: string }>;
}
