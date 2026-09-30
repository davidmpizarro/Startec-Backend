import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { MatriculaService } from './matricula.service';
import { PagarMatriculaDto } from './dto/pagar-matricula.dto';
import { ConfirmarMatriculaDto } from './dto/confirmar-matricula.dto';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(OptionalJwtAuthGuard)
@Controller('matricula')
export class MatriculaController {
  constructor(private readonly matriculaService: MatriculaService) {}

  @Post('pagar')
  @HttpCode(HttpStatus.CREATED)
  pagarMatricula(
    @CurrentUser() user: any,
    @Body() dto: PagarMatriculaDto,
  ) {
    const estudianteId = user?.id || user?.sub || dto.estudianteId || dto.dni;
    if (!estudianteId) {
      throw new BadRequestException(
        'No se pudo identificar al estudiante para registrar el pago',
      );
    }
    return this.matriculaService.procesarPago(estudianteId, dto);
  }

  @Post('confirmar')
  @HttpCode(HttpStatus.OK)
  confirmarMatricula(
    @CurrentUser() user: any,
    @Body() dto?: ConfirmarMatriculaDto,
  ) {
    const estudianteId = user?.id || user?.sub || dto?.estudianteId || dto?.dni;
    if (!estudianteId) {
      throw new BadRequestException(
        'No se pudo identificar al estudiante para confirmar la matrícula',
      );
    }
    return this.matriculaService.confirmarMatricula(estudianteId, dto);
  }

  @Get('historial-pagos')
  obtenerHistorialPagos(
    @CurrentUser() user: any,
    @Query('estudianteId') queryId?: string,
  ) {
    const estudianteId = user?.id || user?.sub || queryId;
    if (!estudianteId) {
      throw new BadRequestException('Token de autenticación requerido para consultar el historial');
    }
    return this.matriculaService.obtenerHistorialPagos(estudianteId);
  }

  @Get('pagos/todos')
  obtenerTodosLosPagos() {
    return this.matriculaService.obtenerTodosLosPagos();
  }

  @Post('pagar-manual')
  @HttpCode(HttpStatus.OK)
  registrarPagoManual(@Body() dto: { estudianteId?: string; dni?: string; monto?: number; concepto?: string; metodo?: string }) {
    return this.matriculaService.registrarPagoManual(dto);
  }

  @Post('recordatorio-pago')
  @HttpCode(HttpStatus.OK)
  enviarRecordatorioPago(@Body() dto: { estudianteId?: string; dni?: string }) {
    return this.matriculaService.enviarRecordatorioPago(dto);
  }

  @Post('recordatorio')
  @HttpCode(HttpStatus.OK)
  enviarRecordatorio(@Body() dto: { paso?: number }) {
    return this.matriculaService.enviarRecordatorioPaso(dto);
  }

  @Get('estado')
  obtenerEstado(
    @CurrentUser() user: any,
    @Query('estudianteId') queryId?: string,
  ) {
    const estudianteId = user?.id || user?.sub || queryId;
    if (!estudianteId) {
      throw new BadRequestException('Token de autenticación requerido para consultar el estado');
    }
    return this.matriculaService.obtenerEstadoMatricula(estudianteId);
  }
}

