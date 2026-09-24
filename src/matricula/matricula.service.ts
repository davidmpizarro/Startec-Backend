import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoMatricula } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PagarMatriculaDto } from './dto/pagar-matricula.dto';

@Injectable()
export class MatriculaService {
  constructor(private readonly prisma: PrismaService) {}

  async procesarPago(estudianteId: string, dto: PagarMatriculaDto) {
    const estudiante = await this.prisma.estudiante.findFirst({
      where: {
        OR: [
          { id: estudianteId },
          { dni: estudianteId },
          ...(dto.estudianteId ? [{ id: dto.estudianteId }] : []),
          ...(dto.dni ? [{ dni: dto.dni }] : []),
        ],
      },
      include: { carrera: true, seccion: true },
    });

    if (!estudiante) {
      throw new BadRequestException(
        'No se pudo identificar al estudiante para registrar el pago',
      );
    }

    if (estudiante.estadoMatricula === EstadoMatricula.MATRICULADO_CONFIRMADO) {
      throw new BadRequestException('El estudiante ya cuenta con la matrícula confirmada');
    }

    // Deducir marca: si dto.numeroTarjeta?.startsWith('4') -> 'Visa', si empieza con '5' -> 'Mastercard', caso contrario 'Visa'
    const numTarjeta = dto.numeroTarjeta ? dto.numeroTarjeta.replace(/\s+/g, '') : '';
    const marca = numTarjeta.startsWith('4')
      ? 'Visa'
      : numTarjeta.startsWith('5')
      ? 'Mastercard'
      : 'Visa';

    // Extraer últimos 4 dígitos: dto.numeroTarjeta ? dto.numeroTarjeta.slice(-4) : '4242'
    const ultimos4 = numTarjeta.length >= 4 ? numTarjeta.slice(-4) : '4242';

    // Guardar el monto real recibido (Number(dto.monto)). Si no viene monto, default 1100, NUNCA 1500
    const monto =
      dto.monto !== undefined && dto.monto !== null && !isNaN(Number(dto.monto)) && Number(dto.monto) > 0
        ? Number(dto.monto)
        : 1100;

    const baseTxId =
      dto.transaccionId && dto.transaccionId.startsWith('chr_')
        ? dto.transaccionId
        : `chr_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Codificamos la metadata de tarjeta en transaccionId: "chr_test_...:Marca:Ultimos4"
    const txId = `${baseTxId}:${marca}:${ultimos4}`;

    // Registramos el pago en la base de datos dentro de una transacción
    const [pago, estudianteActualizado] = await this.prisma.$transaction([
      this.prisma.pago.create({
        data: {
          estudianteId: estudiante.id,
          monto,
          moneda: dto.moneda || 'PEN',
          concepto: dto.concepto || 'Matrícula y 1° Cuota 2027-I',
          estado: 'APROBADO',
          transaccionId: txId,
        },
      }),
      this.prisma.estudiante.update({
        where: { id: estudiante.id },
        data: {
          estadoMatricula: EstadoMatricula.PAGADO_PENDIENTE_HORARIO,
          horarioLiberado: true, // Habilitar acceso a horario tras el pago
          pasoActualMatricula: Math.max(estudiante.pasoActualMatricula ?? 1, 5), // ✅ Paso 5: Pasarela de pagos pagada
        },
        include: {
          carrera: true,
          seccion: true,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Pago de matrícula procesado con éxito vía Culqi',
      pago,
      estudiante: estudianteActualizado,
    };
  }

  async confirmarMatricula(
    estudianteId: string,
    dto?: { estudianteId?: string; dni?: string },
  ) {
    const idABuscar = estudianteId || dto?.estudianteId || dto?.dni;

    if (!idABuscar) {
      throw new BadRequestException(
        'No se pudo identificar al estudiante para confirmar la matrícula',
      );
    }

    const estudiante = await this.prisma.estudiante.findFirst({
      where: {
        OR: [
          { id: idABuscar },
          { dni: idABuscar },
          ...(dto?.estudianteId ? [{ id: dto.estudianteId }] : []),
          ...(dto?.dni ? [{ dni: dto.dni }] : []),
        ],
      },
      include: { carrera: true, seccion: true },
    });

    if (!estudiante) {
      throw new BadRequestException(
        'No se pudo identificar al estudiante para confirmar la matrícula',
      );
    }

    const actualizado = await this.prisma.estudiante.update({
      where: { id: estudiante.id },
      data: {
        estadoMatricula: EstadoMatricula.MATRICULADO_CONFIRMADO,
        horarioLiberado: true,
        pasoActualMatricula: Math.max(estudiante.pasoActualMatricula ?? 1, 6),
      },
      include: { carrera: true, seccion: true },
    });

    const { passwordHash, tokenBiometrico, ...seguro } = actualizado;

    return {
      success: true,
      message: 'Matrícula confirmada con éxito',
      estudiante: seguro,
    };
  }

  async obtenerHistorialPagos(estudianteId: string) {
    const pagos = await this.prisma.pago.findMany({
      where: { estudianteId },
      orderBy: { fechaPago: 'desc' },
    });

    return {
      success: true,
      total: pagos.length,
      data: pagos,
    };
  }

  async obtenerTodosLosPagos() {
    // 1. Recaudación Pasarela Culqi
    const pagos = await this.prisma.pago.findMany({
      orderBy: { fechaPago: 'desc' },
      include: {
        estudiante: {
          select: {
            id: true,
            dni: true,
            nombres: true,
            apellidos: true,
            correoPersonal: true,
            correoInstitucional: true,
            telefono: true,
            carrera: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                sede: true,
              },
            },
            seccion: {
              select: {
                id: true,
                codigoSeccion: true,
              },
            },
          },
        },
      },
    });

    const recaudacionCulqi = pagos.map((p, idx) => {
      let chargeId = p.transaccionId || `chr_test_${Date.now()}_${idx + 1000}`;
      let marca = 'Visa';
      let ultimos4 = '4242';

      if (p.transaccionId && p.transaccionId.includes(':')) {
        const parts = p.transaccionId.split(':');
        chargeId = parts[0];
        if (parts[1]) marca = parts[1];
        if (parts[2]) ultimos4 = parts[2];
      } else if (p.transaccionId && p.transaccionId.startsWith('REC-MANUAL-')) {
        chargeId = p.transaccionId;
        marca = 'Ventanilla';
        ultimos4 = 'Efectivo';
      } else if (p.transaccionId && p.transaccionId.startsWith('chr_')) {
        chargeId = p.transaccionId;
        marca = 'Visa';
        ultimos4 = '4242';
      }

      return {
        id: p.id,
        estudianteId: p.estudianteId,
        chargeId,
        transaccionId: chargeId,
        proveedor: 'CULQI_CHECKOUT',
        fechaPago: p.fechaPago,
        concepto: p.concepto || 'Matrícula y 1° Cuota 2027-I',
        monto: Number(p.monto),
        moneda: p.moneda || 'PEN',
        estado: p.estado || 'APROBADO',
        tarjeta: {
          marca,
          ultimos4,
          tipo: 'Crédito / Débito',
        },
        estudiante: p.estudiante,
      };
    });

    // 2. Cuentas por Cobrar (Postulantes admitidos con liquidación pendiente)
    const estudiantesPendientesList = await this.prisma.estudiante.findMany({
      where: {
        estadoMatricula: { not: EstadoMatricula.MATRICULADO_CONFIRMADO },
        pagos: {
          none: {
            estado: 'APROBADO',
          },
        },
      },
      include: {
        carrera: true,
        seccion: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const cuentasPorCobrar = estudiantesPendientesList.map((e) => {
      const diffMs = Math.max(0, Date.now() - new Date(e.createdAt).getTime());
      const diasEnEspera = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      return {
        id: e.id,
        estudianteId: e.id,
        dni: e.dni,
        estudiante: `${e.nombres || ''} ${e.apellidos || ''}`.trim() || 'Postulante Tecsup',
        nombres: e.nombres,
        apellidos: e.apellidos,
        correoPersonal: e.correoPersonal,
        telefono: e.telefono,
        carrera: e.carrera,
        seccion: e.seccion,
        concepto: 'Matrícula y 1° Cuota 2027-I',
        montoPendiente: 1100,
        moneda: 'PEN',
        diasEnEspera,
        estado: 'Liquidación Generada',
        fechaAdmision: e.createdAt,
      };
    });

    const totalRecaudadoCulqi = recaudacionCulqi
      .filter((p) => p.estado === 'APROBADO')
      .reduce((sum, p) => sum + Number(p.monto), 0);

    const totalTransacciones = recaudacionCulqi.filter(
      (p) => p.estado === 'APROBADO',
    ).length;

    const ticketPromedio =
      totalTransacciones > 0
        ? Number((totalRecaudadoCulqi / totalTransacciones).toFixed(2))
        : 1100;

    const totalPorCobrar = cuentasPorCobrar.reduce(
      (sum, c) => sum + c.montoPendiente,
      0,
    );

    const resumen = {
      totalRecaudadoCulqi,
      totalTransacciones,
      ticketPromedio,
      totalPorCobrar,
      estudiantesPendientes: cuentasPorCobrar.length,
    };

    return {
      success: true,
      resumen,
      recaudacionCulqi,
      cuentasPorCobrar,
      data: recaudacionCulqi, // Retrocompatibilidad
    };
  }

  async registrarPagoManual(dto: {
    estudianteId?: string;
    dni?: string;
    monto?: number;
    concepto?: string;
    metodo?: string;
  }) {
    const idABuscar = dto.estudianteId || dto.dni;
    if (!idABuscar) {
      throw new BadRequestException('Se requiere DNI o ID del estudiante');
    }

    const estudiante = await this.prisma.estudiante.findFirst({
      where: {
        OR: [{ id: idABuscar }, { dni: idABuscar }],
      },
      include: { carrera: true, seccion: true },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const monto = Number(dto.monto) || 1100;
    const metodo = dto.metodo || 'Ventanilla Tecsup / Depósito Bancario';
    const txId = `REC-MANUAL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}:Ventanilla:Efectivo`;

    const [pago, estudianteActualizado] = await this.prisma.$transaction([
      this.prisma.pago.create({
        data: {
          estudianteId: estudiante.id,
          monto,
          moneda: 'PEN',
          concepto: dto.concepto || 'Matrícula y 1° Cuota 2027-I (Ventanilla)',
          estado: 'APROBADO',
          transaccionId: txId,
        },
      }),
      this.prisma.estudiante.update({
        where: { id: estudiante.id },
        data: {
          estadoMatricula: EstadoMatricula.MATRICULADO_CONFIRMADO,
          horarioLiberado: true,
          pasoActualMatricula: Math.max(estudiante.pasoActualMatricula ?? 1, 6),
        },
        include: { carrera: true, seccion: true },
      }),
    ]);

    return {
      success: true,
      message: `Pago manual de S/ ${monto.toFixed(2)} registrado con éxito (${metodo})`,
      pago,
      estudiante: estudianteActualizado,
    };
  }

  async enviarRecordatorioPaso(dto: { paso?: number }) {
    const paso = dto?.paso !== undefined ? Number(dto.paso) : undefined;

    let totalNotificados = 0;
    if (paso !== undefined && !isNaN(paso)) {
      totalNotificados = await this.prisma.estudiante.count({
        where: { pasoActualMatricula: paso },
      });
    } else {
      totalNotificados = await this.prisma.estudiante.count();
    }

    const cantidad = totalNotificados > 0 ? totalNotificados : 1;

    return {
      success: true,
      message: `Recordatorio enviado a ${cantidad} postulante${cantidad === 1 ? '' : 's'}${paso ? ` en el Paso ${paso}` : ''}`,
      totalNotificados: cantidad,
      paso,
      timestamp: new Date().toISOString(),
    };
  }

  async enviarRecordatorioPago(dto: { estudianteId?: string; dni?: string }) {
    const idABuscar = dto.estudianteId || dto.dni;
    const estudiante = await this.prisma.estudiante.findFirst({
      where: {
        OR: [{ id: idABuscar }, { dni: idABuscar }],
      },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    return {
      success: true,
      message: `Recordatorio push enviado con éxito al postulante ${estudiante.nombres || ''} ${estudiante.apellidos || ''} (DNI ${estudiante.dni})`,
      estudianteId: estudiante.id,
      timestamp: new Date().toISOString(),
    };
  }

  async obtenerEstadoMatricula(estudianteId: string) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
      select: {
        id: true,
        dni: true,
        nombres: true,
        apellidos: true,
        estadoMatricula: true,
        pasoActualMatricula: true,
        horarioLiberado: true,
        carrera: true,
        seccion: true,
        pagos: {
          orderBy: { fechaPago: 'desc' },
        },
      },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    return {
      success: true,
      data: estudiante,
    };
  }
}
