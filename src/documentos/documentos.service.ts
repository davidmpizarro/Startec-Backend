import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type DocumentoTipo = 'DNI' | 'CERTIFICADO' | 'CARTA_COMPROMISO';

interface ArchivoSubido {
  tipo: DocumentoTipo;
  file: Express.Multer.File;
}

@Injectable()
export class DocumentosService {
  private readonly logger = new Logger(DocumentosService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // POST /estudiantes/documentos
  // ──────────────────────────────────────────────────────────────────────────
  async subirDocumentos(
    estudianteId: string,
    files: {
      dni?: Express.Multer.File[];
      certificado?: Express.Multer.File[];
      cartaCompromiso?: Express.Multer.File[];
    },
    baseUrl: string,
  ) {
    if (!estudianteId) {
      throw new BadRequestException('El campo estudianteId es requerido.');
    }

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
      select: { id: true, nombres: true, apellidos: true, pasoActualMatricula: true },
    });

    if (!estudiante) {
      throw new NotFoundException(
        `Estudiante con id "${estudianteId}" no encontrado.`,
      );
    }

    // Documentos existentes del estudiante
    const docsExistentes = await this.prisma.documentoEstudiante.findMany({
      where: { estudianteId },
    });

    const tieneExpedientePrevio = docsExistentes.length > 0;

    // Si es primera carga (sin expediente previo), DNI y Certificado son obligatorios
    if (!tieneExpedientePrevio) {
      if (!files.dni?.[0] || !files.certificado?.[0]) {
        throw new BadRequestException(
          'Los documentos DNI y Certificado de Estudios son obligatorios para la carga inicial.',
        );
      }
    } else {
      // Si es una corrección o reenvío, debe enviar al menos un archivo
      if (!files.dni?.[0] && !files.certificado?.[0] && !files.cartaCompromiso?.[0]) {
        throw new BadRequestException(
          'Debe enviar al menos un documento para actualizar.',
        );
      }
    }

    // Construir lista de archivos a registrar o actualizar
    const aRegistrar: ArchivoSubido[] = [];

    if (files.dni?.[0]) {
      aRegistrar.push({ tipo: 'DNI', file: files.dni[0] });
    }
    if (files.certificado?.[0]) {
      aRegistrar.push({ tipo: 'CERTIFICADO', file: files.certificado[0] });
    }
    if (files.cartaCompromiso?.[0]) {
      aRegistrar.push({ tipo: 'CARTA_COMPROMISO', file: files.cartaCompromiso[0] });
    }

    // Actualizar registro existente (reseteando a EN_REVISION y motivoObservacion: null) o crear nuevo
    const documentos = await Promise.all(
      aRegistrar.map(async ({ tipo, file }) => {
        const archivoUrl = `${baseUrl}/uploads/documentos/${file.filename}`;
        const docExistente = docsExistentes.find((d) => d.tipo === tipo);

        if (docExistente) {
          return this.prisma.documentoEstudiante.update({
            where: { id: docExistente.id },
            data: {
              archivoUrl,
              nombreOriginal: file.originalname,
              tamanoBytes: file.size,
              estado: 'EN_REVISION',
              motivoObservacion: null,
              fechaSubida: new Date(),
              fechaRevision: null,
            },
          });
        }

        return this.prisma.documentoEstudiante.create({
          data: {
            estudianteId,
            tipo,
            archivoUrl,
            nombreOriginal: file.originalname,
            tamanoBytes: file.size,
            estado: 'EN_REVISION',
            motivoObservacion: null,
            fechaSubida: new Date(),
          },
        });
      }),
    );

    // Asegurar que el paso de matrícula avance al menos a 4
    const nuevoPaso = Math.max(estudiante.pasoActualMatricula ?? 1, 4);
    if (nuevoPaso !== estudiante.pasoActualMatricula) {
      await this.prisma.estudiante.update({
        where: { id: estudianteId },
        data: { pasoActualMatricula: nuevoPaso },
      });
    }

    this.logger.log(
      `[subirDocumentos] Estudiante ${estudiante.nombres} ${estudiante.apellidos} — ${documentos.length} doc(s) procesados. Paso actual: ${nuevoPaso}`,
    );

    return {
      success: true,
      estado: 'EN_REVISION',
      documentos,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /estudiantes/:estudianteId/documentos
  // ──────────────────────────────────────────────────────────────────────────
  async obtenerDocumentosPorEstudiante(estudianteId: string) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
      select: {
        id: true,
        dni: true,
        nombres: true,
        apellidos: true,
        pasoActualMatricula: true,
        carrera: {
          select: { codigo: true, nombre: true },
        },
        documentos: {
          orderBy: { fechaSubida: 'desc' },
          select: {
            id: true,
            tipo: true,
            archivoUrl: true,
            nombreOriginal: true,
            tamanoBytes: true,
            estado: true,
            motivoObservacion: true,
            fechaSubida: true,
            fechaRevision: true,
          },
        },
      },
    });

    if (!estudiante) {
      throw new NotFoundException(
        `Estudiante con id "${estudianteId}" no encontrado.`,
      );
    }

    const docs = estudiante.documentos;
    let estadoGlobal = 'EN_REVISION';
    if (docs.length > 0) {
      if (docs.some((d) => d.estado === 'OBSERVADO')) {
        estadoGlobal = 'OBSERVADO';
      } else if (docs.every((d) => d.estado === 'APROBADO')) {
        estadoGlobal = 'APROBADO';
      } else {
        estadoGlobal = 'EN_REVISION';
      }
    }

    return {
      success: true,
      estadoGlobal,
      estudiante: {
        id: estudiante.id,
        dni: estudiante.dni,
        nombres: estudiante.nombres,
        apellidos: estudiante.apellidos,
        carreraCodigo: estudiante.carrera?.codigo ?? null,
        carreraNombre: estudiante.carrera?.nombre ?? null,
        pasoActualMatricula: estudiante.pasoActualMatricula ?? 1,
      },
      documentos: docs,
    };
  }


  // ──────────────────────────────────────────────────────────────────────────
  // GET /admin/documentos
  // ──────────────────────────────────────────────────────────────────────────
  async getDocumentosAdmin() {
    const estudiantes = await this.prisma.estudiante.findMany({
      where: {
        documentos: { some: {} }, // Solo quienes ya cargaron documentos
      },
      select: {
        id: true,
        dni: true,
        nombres: true,
        apellidos: true,
        pasoActualMatricula: true,
        carrera: {
          select: { codigo: true, nombre: true },
        },
        documentos: {
          orderBy: { fechaSubida: 'desc' },
          select: {
            id: true,
            tipo: true,
            archivoUrl: true,
            nombreOriginal: true,
            tamanoBytes: true,
            estado: true,
            motivoObservacion: true,
            fechaSubida: true,
            fechaRevision: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: estudiantes.map((e) => ({
        id: e.id,
        dni: e.dni,
        nombres: e.nombres,
        apellidos: e.apellidos,
        carreraCodigo: e.carrera?.codigo ?? null,
        carreraNombre: e.carrera?.nombre ?? null,
        pasoActualMatricula: e.pasoActualMatricula ?? 1,
        documentos: e.documentos,
      })),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /admin/documentos/:documentoId/aprobar
  // ──────────────────────────────────────────────────────────────────────────
  async aprobarDocumento(documentoId: string) {
    const doc = await this.prisma.documentoEstudiante.findUnique({
      where: { id: documentoId },
    });

    if (!doc) {
      throw new NotFoundException(
        `Documento con id "${documentoId}" no encontrado.`,
      );
    }

    const actualizado = await this.prisma.documentoEstudiante.update({
      where: { id: documentoId },
      data: {
        estado: 'APROBADO',
        fechaRevision: new Date(),
        motivoObservacion: null,
      },
    });

    this.logger.log(`[aprobarDocumento] Doc ${documentoId} → APROBADO`);

    return { success: true, data: actualizado };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /admin/documentos/:documentoId/observar
  // ──────────────────────────────────────────────────────────────────────────
  async observarDocumento(documentoId: string, motivo: string) {
    const doc = await this.prisma.documentoEstudiante.findUnique({
      where: { id: documentoId },
    });

    if (!doc) {
      throw new NotFoundException(
        `Documento con id "${documentoId}" no encontrado.`,
      );
    }

    if (!motivo?.trim()) {
      throw new BadRequestException(
        'El motivo de observación no puede estar vacío.',
      );
    }

    const actualizado = await this.prisma.documentoEstudiante.update({
      where: { id: documentoId },
      data: {
        estado: 'OBSERVADO',
        motivoObservacion: motivo.trim(),
        fechaRevision: new Date(),
      },
    });

    this.logger.log(
      `[observarDocumento] Doc ${documentoId} → OBSERVADO. Motivo: "${motivo.trim()}"`,
    );

    return { success: true, data: actualizado };
  }
}
