import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { MatriculaService } from './matricula.service';
import { PagarMatriculaDto } from './dto/pagar-matricula.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('matricula')
export class MatriculaController {
  constructor(private readonly matriculaService: MatriculaService) {}

  @Post('pagar')
  @HttpCode(HttpStatus.CREATED)
  pagarMatricula(
    @CurrentUser() user: any,
    @Body() dto: PagarMatriculaDto,
  ) {
    return this.matriculaService.procesarPago(user.id, dto);
  }

  @Post('confirmar')
  @HttpCode(HttpStatus.OK)
  confirmarMatricula(@CurrentUser() user: any) {
    return this.matriculaService.confirmarMatricula(user.id);
  }

  @Get('historial-pagos')
  obtenerHistorialPagos(@CurrentUser() user: any) {
    return this.matriculaService.obtenerHistorialPagos(user.id);
  }

  @Get('estado')
  obtenerEstado(@CurrentUser() user: any) {
    return this.matriculaService.obtenerEstadoMatricula(user.id);
  }
}
