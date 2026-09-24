import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CARRERAS_TECSUP_OFICIALES } from '../estudiantes/estudiantes.service';

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

    const mapped = carreras.map((c) => ({
      ...c,
      nombre: CARRERAS_TECSUP_OFICIALES[c.codigo] || c.nombre,
    }));

    return {
      success: true,
      total: mapped.length,
      data: mapped,
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

    if (carrera && CARRERAS_TECSUP_OFICIALES[carrera.codigo]) {
      carrera.nombre = CARRERAS_TECSUP_OFICIALES[carrera.codigo];
    }

    return {
      success: !!carrera,
      data: carrera,
    };
  }
}
