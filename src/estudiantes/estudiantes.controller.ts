import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { EstudiantesService } from './estudiantes.service';
import { ActualizarPasoDto } from './dto/actualizar-paso.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('estudiantes')
export class EstudiantesController {
  constructor(private readonly estudiantesService: EstudiantesService) {}

  @Get('perfil')
  obtenerPerfil(@CurrentUser() user: any) {
    return this.estudiantesService.obtenerPerfil(user.id);
  }

  @Patch('paso-matricula')
  actualizarPasoMatricula(
    @CurrentUser() user: any,
    @Body() dto: ActualizarPasoDto,
  ) {
    return this.estudiantesService.actualizarPasoMatricula(user.id, dto);
  }
}
