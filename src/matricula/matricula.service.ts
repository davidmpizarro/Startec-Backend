import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoMatricula } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PagarMatriculaDto } from './dto/pagar-matricula.dto';

@Injectable()
export class MatriculaService {
  constructor(private readonly prisma: PrismaService) {}

  async procesarPago(estudianteId: string, dto: PagarMatriculaDto) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
      include: { carrera: true, seccion: true },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    if (estudiante.estadoMatricula === EstadoMatricula.MATRICULADO_CONFIRMADO) {
      throw new BadRequestException('El estudiante ya cuenta con la matrícula confirmada');
    }

    const txId =
      dto.transaccionId ||
      `TX-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Registramos el pago en la base de datos dentro de una transacción
    const [pago, estudianteActualizado] = await this.prisma.$transaction([
      this.prisma.pago.create({
        data: {
          estudianteId: estudiante.id,
          monto: dto.monto,
          moneda: dto.moneda || 'PEN',
          concepto: dto.concepto || 'Cuota Matrícula 2026-1',
          estado: 'APROBADO',
          transaccionId: txId,
        },
      }),
      this.prisma.estudiante.update({
        where: { id: estudiante.id },
        data: {
          estadoMatricula: EstadoMatricula.PAGADO_PENDIENTE_HORARIO,
          horarioLiberado: true, // Habilitar acceso a horario tras el pago
          pasoActualMatricula:
            estudiante.pasoActualMatricula < 4 ? 4 : estudiante.pasoActualMatricula,
        },
        include: {
          carrera: true,
          seccion: true,
        },
      }),
    ]);

    const { passwordHash, tokenBiometrico, ...seguro } = estudianteActualizado;

    return {
      success: true,
      message: 'Pago de matrícula procesado y aprobado con éxito',
      pago,
      estudiante: seguro,
    };
  }

  async confirmarMatricula(estudianteId: string) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const actualizado = await this.prisma.estudiante.update({
      where: { id: estudianteId },
      data: {
        estadoMatricula: EstadoMatricula.MATRICULADO_CONFIRMADO,
        horarioLiberado: true,
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
