import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { HorariosService } from './horarios.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('horarios')
export class HorariosController {
  constructor(private readonly horariosService: HorariosService) {}

  @UseGuards(JwtAuthGuard)
  @Get('mi-horario')
  obtenerHorarioEstudiante(@CurrentUser() user: any) {
    return this.horariosService.obtenerHorarioEstudiante(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('seccion/:seccionId')
  obtenerHorarioPorSeccion(@Param('seccionId') seccionId: string) {
    return this.horariosService.obtenerHorarioPorSeccion(seccionId);
  }
}
