import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoMatricula } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPasoDto } from './dto/actualizar-paso.dto';

@Injectable()
export class EstudiantesService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerPerfil(estudianteId: string) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
      include: {
        carrera: {
          include: {
            cursos: {
              where: { ciclo: 1 },
              orderBy: { codigo: 'asc' },
            },
          },
        },
        seccion: true,
        pagos: {
          orderBy: { fechaPago: 'desc' },
        },
      },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const { passwordHash, tokenBiometrico, ...perfilSeguro } = estudiante;

    return {
      success: true,
      data: perfilSeguro,
    };
  }

  async actualizarPasoMatricula(estudianteId: string, dto: ActualizarPasoDto) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Si estaba NO_INICIADO y avanza de paso, cambiamos el estado a EN_PROCESO
    let nuevoEstado = estudiante.estadoMatricula;
    if (estudiante.estadoMatricula === EstadoMatricula.NO_INICIADO && dto.paso > 1) {
      nuevoEstado = EstadoMatricula.EN_PROCESO;
    }

    const actualizado = await this.prisma.estudiante.update({
      where: { id: estudianteId },
      data: {
        pasoActualMatricula: dto.paso,
        estadoMatricula: nuevoEstado,
      },
      include: {
        carrera: {
          include: {
            cursos: {
              where: { ciclo: 1 },
              orderBy: { codigo: 'asc' },
            },
          },
        },
        seccion: true,
      },
    });

    const { passwordHash, tokenBiometrico, ...seguro } = actualizado;

    return {
      success: true,
      message: `Paso de matrícula actualizado al paso ${dto.paso}`,
      data: seguro,
    };
  }
}
