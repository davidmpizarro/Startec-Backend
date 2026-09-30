import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ObservarDocumentoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres.' })
  motivo: string;
}
