import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterBiometricDto {
  @IsString()
  @IsNotEmpty({ message: 'El token biométrico es obligatorio' })
  tokenBiometrico: string;

  @IsString()
  @IsOptional()
  fotoPerfilUrl?: string;
}
