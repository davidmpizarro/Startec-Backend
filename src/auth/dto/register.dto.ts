import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @Length(8, 20, { message: 'El DNI debe tener entre 8 y 20 caracteres' })
  dni: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  nombres: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  apellidos: string;

  @IsString()
  @IsOptional()
  codigoCarrera?: string; // ej: "C24", "C11", "C12"

  @IsString()
  @IsOptional()
  carreraId?: string; // UUID de la carrera si Flutter envía el id directamente

  @IsString()
  @IsOptional()
  correoPersonal?: string;

  @IsString()
  @IsOptional()
  telefono?: string;
}
