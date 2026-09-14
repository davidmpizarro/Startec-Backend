import { IsInt, Min, Max } from 'class-validator';

export class ActualizarPasoDto {
  @IsInt({ message: 'El paso debe ser un número entero' })
  @Min(1, { message: 'El paso mínimo es 1' })
  @Max(10, { message: 'El paso no puede ser mayor a 10' })
  paso: number;
}
