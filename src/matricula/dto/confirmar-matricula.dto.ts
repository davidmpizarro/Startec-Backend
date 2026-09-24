import { IsOptional, IsString } from 'class-validator';

export class ConfirmarMatriculaDto {
  @IsOptional()
  @IsString()
  estudianteId?: string;

  @IsOptional()
  @IsString()
  dni?: string;
}
