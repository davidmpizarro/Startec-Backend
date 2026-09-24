import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EmbudoPaso {
  paso: number;
  stepNumber: number;
  titulo: string;
  name: string;
  shortName: string;
  subtitulo: string;
  tag: string;
  cantidad: number;
  count: number;
  porcentaje: number;
  conversionFromPrevious: number;
  dropoffRate: number;
  status: 'completed' | 'in_progress' | 'attention';
}

const PASOS_CONFIG = [
  {
    stepNumber: 1,
    name: 'Paso 1: Inicia tu experiencia Tecsup',
    shortName: 'Bienvenida y acceso al sistema institucional',
  },
  {
    stepNumber: 2,
    name: 'Paso 2: Actualiza tu perfil',
    shortName: 'Validación de datos personales y de contacto',
  },
  {
    stepNumber: 3,
    name: 'Paso 3: Carga tus documentos',
    shortName: 'Expediente digital y certificados de admisión',
  },
  {
    stepNumber: 4,
    name: 'Paso 4: Pago de Matrícula',
    shortName: 'Liquidación y selección de modalidad de pago',
  },
  {
    stepNumber: 5,
    name: 'Paso 5: Pasarela de pagos',
    shortName: 'Transacción financiera y procesamiento en pasarela',
  },
  {
    stepNumber: 6,
    name: 'Paso 6: Confirmación de matrícula',
    shortName: 'Generación de constancia y conformidad de vacante',
  },
  {
    stepNumber: 7,
    name: 'Paso 7: Conoce tu carrera',
    shortName: 'Malla curricular, plan de estudios y asignación académica',
  },
  {
    stepNumber: 8,
    name: 'Paso 8: Conquista el campus',
    shortName: 'Activación de credenciales institucionales e inducción presencial',
  },
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerMetricas() {
    const estudiantes = await this.prisma.estudiante.findMany({
      select: {
        id: true,
        pasoActualMatricula: true,
        estadoMatricula: true,
        biometriaRegistrada: true,
      },
    });

    const totalAdmitidos = estudiantes.length;
    const matriculadosOficiales = estudiantes.filter(
      (e) => e.estadoMatricula === 'MATRICULADO_CONFIRMADO',
    ).length;
    const pagosPendientes = estudiantes.filter(
      (e) => (e.pasoActualMatricula ?? 1) < 6,
    ).length;
    const biometriasCompletadas = estudiantes.filter(
      (e) => e.biometriaRegistrada,
    ).length;

    const embudo: EmbudoPaso[] = PASOS_CONFIG.map((cfg, idx) => {
      const pasoNum = cfg.stepNumber;
      const cantidad = estudiantes.filter(
        (e) => (e.pasoActualMatricula ?? 1) >= pasoNum,
      ).length;

      const porcentaje =
        totalAdmitidos > 0
          ? Number(((cantidad / totalAdmitidos) * 100).toFixed(1))
          : 0;

      const prevCount =
        idx === 0
          ? totalAdmitidos
          : estudiantes.filter(
              (e) => (e.pasoActualMatricula ?? 1) >= pasoNum - 1,
            ).length;

      const conversionFromPrevious =
        prevCount > 0
          ? Number(((cantidad / prevCount) * 100).toFixed(1))
          : 0;

      const dropoffRate = Number(
        Math.max(0, 100 - conversionFromPrevious).toFixed(1),
      );

      let status: 'completed' | 'in_progress' | 'attention' = 'in_progress';
      if (porcentaje >= 80) {
        status = 'completed';
      } else if (dropoffRate > 25 || porcentaje < 30) {
        status = 'attention';
      }

      return {
        paso: pasoNum,
        stepNumber: pasoNum,
        titulo: cfg.name,
        name: cfg.name,
        shortName: cfg.shortName,
        subtitulo: cfg.shortName,
        tag: cfg.shortName,
        cantidad,
        count: cantidad,
        porcentaje,
        conversionFromPrevious,
        dropoffRate,
        status,
      };
    });

    const kpis = {
      totalAdmitidos: {
        title: 'Total Admitidos',
        value: totalAdmitidos,
        formattedValue: totalAdmitidos.toLocaleString('es-PE'),
        changePercent: 14.8,
        period: 'Padrón Oficial 2027-I',
        iconName: 'Users' as const,
        variant: 'primary' as const,
        description: 'Postulantes admitidos en el sistema',
      },
      matriculados: {
        title: 'Matriculados Oficiales',
        value: matriculadosOficiales,
        formattedValue: matriculadosOficiales.toLocaleString('es-PE'),
        changePercent:
          totalAdmitidos > 0
            ? Number(((matriculadosOficiales / totalAdmitidos) * 100).toFixed(1))
            : 0,
        period: `${totalAdmitidos > 0 ? ((matriculadosOficiales / totalAdmitidos) * 100).toFixed(1) : 0}% de avance`,
        iconName: 'GraduationCap' as const,
        variant: 'success' as const,
        description: 'Expediente completo y matrícula confirmada',
      },
      pagosPendientes: {
        title: 'Pagos Pendientes',
        value: pagosPendientes,
        formattedValue: pagosPendientes.toLocaleString('es-PE'),
        changePercent:
          totalAdmitidos > 0
            ? Number(((pagosPendientes / totalAdmitidos) * 100).toFixed(1))
            : 0,
        period: 'Paso < 6 pendiente',
        iconName: 'CreditCard' as const,
        variant: 'warning' as const,
        description: 'Pendientes de liquidación en tesorería',
      },
      biometriasCompletadas: {
        title: 'Biometrías Completadas',
        value: biometriasCompletadas,
        formattedValue: biometriasCompletadas.toLocaleString('es-PE'),
        changePercent:
          totalAdmitidos > 0
            ? Number(((biometriasCompletadas / totalAdmitidos) * 100).toFixed(1))
            : 0,
        period: `${totalAdmitidos > 0 ? ((biometriasCompletadas / totalAdmitidos) * 100).toFixed(1) : 0}% del padrón`,
        iconName: 'Fingerprint' as const,
        variant: 'info' as const,
        description: 'Validación biométrica facial/dactilar',
      },
    };

    return {
      success: true,
      totalAdmitidos,
      matriculadosOficiales,
      pagosPendientes,
      biometriasCompletadas,
      embudo,
      kpis,
      funnel: embudo,
      lastUpdated: new Date().toISOString(),
      periodName: 'Semestre Académico 2027-I (Campus Lima)',
    };
  }
}
