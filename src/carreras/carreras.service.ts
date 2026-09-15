import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CarrerasService {
  constructor(private readonly prisma: PrismaService) {}

  async listarCarreras() {
    const carreras = await this.prisma.carrera.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
        sede: true,
        totalCiclos: true,
      },
      orderBy: {
        codigo: 'asc',
      },
    });

    return {
      success: true,
      total: carreras.length,
      data: carreras,
    };
  }

  async obtenerCarreraPorId(id: string) {
    const carrera = await this.prisma.carrera.findUnique({
      where: { id },
      include: {
        cursos: {
          where: { ciclo: 1 },
          orderBy: { codigo: 'asc' },
        },
        secciones: {
          where: { ciclo: 1 },
        },
      },
    });

    return {
      success: !!carrera,
      data: carrera,
    };
  }
}
