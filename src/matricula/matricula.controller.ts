import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Header,
} from '@nestjs/common';
import { MatriculaService } from './matricula.service';
import { PagarMatriculaDto } from './dto/pagar-matricula.dto';
import { ConfirmarMatriculaDto } from './dto/confirmar-matricula.dto';
import { GenerarLinkPagoDto } from './dto/generar-link-pago.dto';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(OptionalJwtAuthGuard)
@Controller('matricula')
export class MatriculaController {
  constructor(private readonly matriculaService: MatriculaService) {}

  @Post('generar-link-pago')
  @HttpCode(HttpStatus.OK)
  generarLinkPago(
    @CurrentUser() user: any,
    @Body() dto: GenerarLinkPagoDto,
  ) {
    const estudianteId = dto?.estudianteId || user?.id || user?.sub || dto?.dni;
    if (!estudianteId) {
      throw new BadRequestException('ID o DNI del estudiante requerido');
    }
    return this.matriculaService.generarLinkPago(estudianteId, dto);
  }

  @Post('generar-link-pago/:estudianteId')
  @HttpCode(HttpStatus.OK)
  generarLinkPagoConParam(
    @Param('estudianteId') paramEstudianteId: string,
    @CurrentUser() user: any,
    @Body() dto: GenerarLinkPagoDto,
  ) {
    const estudianteId = paramEstudianteId || dto?.estudianteId || user?.id || user?.sub || dto?.dni;
    if (!estudianteId) {
      throw new BadRequestException('ID o DNI del estudiante requerido');
    }
    return this.matriculaService.generarLinkPago(estudianteId, dto);
  }

  @Post('mercadopago-webhook')
  @HttpCode(HttpStatus.OK)
  mercadopagoWebhook(
    @Body() payload: any,
    @Query() query: any,
  ) {
    return this.matriculaService.procesarWebhookMercadoPago(payload, query);
  }

    // Puente de retorno de Mercado Pago -> abre la app Flutter por deep link
  @Get('retorno/:estado')
  @Header('Content-Type', 'text/html; charset=utf-8')
  retornoMercadoPago(@Param('estado') estado: string) {
    const destinos: Record<string, string> = {
      exito: 'pago-exitoso',
      fallido: 'pago-fallido',
      pendiente: 'pago-pendiente',
    };
    const destino = destinos[estado];
    if (!destino) {
      throw new BadRequestException('Estado de retorno inválido');
    }
    const deepLink = `startec://${destino}`;

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Volviendo a STARTEC</title>
  <style>
    body { font-family: Arial, sans-serif; background:#F7F5FC; display:flex; flex-direction:column;
           align-items:center; justify-content:center; min-height:100vh; margin:0; padding:24px;
           text-align:center; color:#1E1435; }
    a { background:#B96DFF; color:#fff; text-decoration:none; padding:14px 28px;
        border-radius:30px; font-weight:bold; margin-top:20px; }
  </style>
</head>
<body>
  <h2>Regresando a la app STARTEC...</h2>
  <p>Si no se abre automáticamente, toca el botón.</p>
  <a href="${deepLink}">Abrir STARTEC</a>
  <script>window.location.href = "${deepLink}";</script>
</body>
</html>`;
  }

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

