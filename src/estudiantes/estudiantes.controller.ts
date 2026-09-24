import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EstudiantesService } from './estudiantes.service';
import { ActualizarPasoDto } from './dto/actualizar-paso.dto';
import { PreAdmitirEstudianteDto } from './dto/pre-admitir-estudiante.dto';
import { ActualizarEstudianteDto } from './dto/actualizar-estudiante.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('estudiantes')
export class EstudiantesController {
  constructor(private readonly estudiantesService: EstudiantesService) {}

  @Get()
  obtenerTodos() {
    return this.estudiantesService.obtenerTodos();
  }

  @Post('pre-admitir')
  @HttpCode(HttpStatus.CREATED)
  preAdmitir(@Body() dto: PreAdmitirEstudianteDto) {
    return this.estudiantesService.preAdmitir(dto);
  }

  @Post('importar-csv')
  @HttpCode(HttpStatus.OK)
  importarCsv(@Body() body: any) {
    const estudiantes = Array.isArray(body)
      ? body
      : Array.isArray(body?.estudiantes)
      ? body.estudiantes
      : [];
    return this.estudiantesService.importarEstudiantesMasivo(estudiantes);
  }

    @Patch(':id/paso')
  actualizarPasoPorId(
    @Param('id') id: string,
    @Body() dto: ActualizarPasoDto,
  ) {
    return this.estudiantesService.actualizarPasoMatricula(id, dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarEstudianteDto,
  ) {
    return this.estudiantesService.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.estudiantesService.eliminar(id);
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.estudiantesService.resetPassword(id);
  }

  @Post(':id/reset-biometrics')
  resetBiometrics(@Param('id') id: string) {
    return this.estudiantesService.resetBiometrics(id);
  }

  @Post(':id/release-schedule')
  releaseSchedule(@Param('id') id: string) {
    return this.estudiantesService.releaseSchedule(id);
  }

  @Post(':id/formalizar-matricula')
  formalizarMatricula(@Param('id') id: string) {
    return this.estudiantesService.formalizarMatricula(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  obtenerPerfil(@CurrentUser() user: any) {
    return this.estudiantesService.obtenerPerfil(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('paso-matricula')
  actualizarPasoMatricula(
    @CurrentUser() user: any,
    @Body() dto: ActualizarPasoDto,
  ) {
    return this.estudiantesService.actualizarPasoMatricula(user.id, dto);
  }
}
