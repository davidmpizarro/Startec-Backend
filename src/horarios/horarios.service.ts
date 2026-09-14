import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DiaSemana } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ordenDias: Record<DiaSemana, number> = {
  [DiaSemana.LUNES]: 1,
  [DiaSemana.MARTES]: 2,
  [DiaSemana.MIERCOLES]: 3,
  [DiaSemana.JUEVES]: 4,
  [DiaSemana.VIERNES]: 5,
  [DiaSemana.SABADO]: 6,
};

@Injectable()
export class HorariosService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerHorarioEstudiante(estudianteId: string) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
      include: {
        seccion: true,
        carrera: true,
      },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    if (!estudiante.seccionId) {
      throw new NotFoundException(
        'El estudiante aún no tiene una sección académica asignada por coordinación',
      );
    }

    if (!estudiante.horarioLiberado) {
      throw new ForbiddenException(
        'El horario aún no se encuentra liberado. Por favor completa el pago de tu matrícula o espera la habilitación de coordinación.',
      );
    }

    const sesiones = await this.prisma.sesionHorario.findMany({
      where: { seccionId: estudiante.seccionId },
      include: {
        curso: true,
        seccion: true,
      },
    });

    // Ordenar cronológicamente por día y por horaInicio
    sesiones.sort((a, b) => {
      const diaDiff = ordenDias[a.dia] - ordenDias[b.dia];
      if (diaDiff !== 0) return diaDiff;
      return a.horaInicio.localeCompare(b.horaInicio);
    });

    return {
      success: true,
      data: {
        seccion: estudiante.seccion,
        carrera: estudiante.carrera,
        totalSesiones: sesiones.length,
        horarios: sesiones.map((s) => ({
          id: s.id,
          dia: s.dia,
          horaInicio: s.horaInicio,
          horaFin: s.horaFin,
          aula: s.aula,
          docente: s.docente,
          curso: {
            id: s.curso.id,
            codigo: s.curso.codigo,
            nombre: s.curso.nombre,
            creditos: s.curso.creditos,
            horasSemanales: s.curso.horasSemanales,
            tipoCompetencia: s.curso.tipoCompetencia,
          },
        })),
      },
    };
  }

  async obtenerHorarioPorSeccion(seccionId: string) {
    const seccion = await this.prisma.seccion.findUnique({
      where: { id: seccionId },
      include: { carrera: true },
    });

    if (!seccion) {
      throw new NotFoundException('Sección no encontrada');
    }

    const sesiones = await this.prisma.sesionHorario.findMany({
      where: { seccionId },
      include: { curso: true },
    });

    sesiones.sort((a, b) => {
      const diaDiff = ordenDias[a.dia] - ordenDias[b.dia];
      if (diaDiff !== 0) return diaDiff;
      return a.horaInicio.localeCompare(b.horaInicio);
    });

    return {
      success: true,
      data: {
        seccion,
        horarios: sesiones,
      },
    };
  }
}
