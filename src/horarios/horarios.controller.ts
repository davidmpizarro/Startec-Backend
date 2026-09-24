import { Controller, Get, Param, Headers } from '@nestjs/common';
import { HorariosService } from './horarios.service';

@Controller('horarios')
export class HorariosController {
  constructor(private readonly horariosService: HorariosService) {}

  @Get('mi-horario')
  async obtenerHorarioEstudiante(
    @Headers('x-user-dni') dniHeader?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    // 1. Si viene cabecera con el DNI del estudiante
    if (dniHeader && dniHeader.trim().length > 0) {
      return this.horariosService.obtenerHorarioPorDni(dniHeader.trim());
    }

    // 2. Si viene token JWT en la cabecera Authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const payload = this.horariosService.decodeToken(token);
      if (payload?.sub) {
        return this.horariosService.obtenerHorarioEstudiante(payload.sub);
      }
      if (payload?.dni) {
        return this.horariosService.obtenerHorarioPorDni(payload.dni);
      }
    }

    // 3. Fallback al estudiante de prueba para desarrollo y emulador
    return this.horariosService.obtenerHorarioPorDni('72123456');
  }

  @Get('seccion/:seccionId')
  obtenerHorarioPorSeccion(@Param('seccionId') seccionId: string) {
    return this.horariosService.obtenerHorarioPorSeccion(seccionId);
  }
}
