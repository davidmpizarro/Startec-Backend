import { IsNotEmpty, IsString } from 'class-validator';

export class BiometricLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  dni: string;

  @IsString()
  @IsNotEmpty({ message: 'El token biométrico es obligatorio' })
  tokenBiometrico: string;
}
