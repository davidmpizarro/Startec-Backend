import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { EstadoMatricula } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPasoDto } from './dto/actualizar-paso.dto';
import { PreAdmitirEstudianteDto } from './dto/pre-admitir-estudiante.dto';
import { ActualizarEstudianteDto } from './dto/actualizar-estudiante.dto';
import {
  ImportEstudianteDto,
  ImportarEstudiantesResultado,
} from './dto/importar-estudiantes.dto';

function generarCorreoInstitucional(nombres: string, apellidos: string): string {
  const sanitize = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();

  const primerNombre = sanitize(nombres.trim().split(/\s+/)[0] || 'estudiante');
  const primerApellido = sanitize(apellidos.trim().split(/\s+/)[0] || 'tecsup');

  return `${primerNombre}.${primerApellido}@tecsup.edu.pe`;
}

export const CARRERAS_TECSUP_OFICIALES: Record<string, string> = {
  C1: 'Procesos Químicos y Metalúrgicos',
  C5: 'Electrónica y Automatización Industrial',
  C11: 'Operaciones Mineras',
  C12: 'Producción y Gestión Industrial',
  C14: 'Aviónica y Mecánica Aeronáutica',
  C16: 'Mecatrónica Industrial',
  C20: 'Administración de Redes y Comunicaciones',
  C21: 'Mantenimiento de Maquinaria Pesada',
  C22: 'Mantenimiento de Maquinaria de Planta',
  C23: 'Electricidad Industrial',
  C24: 'Diseño y Desarrollo de Software',
  C25: 'Diseño Industrial',
  C26: 'Diseño y Desarrollo de Videojuegos',
  C28: 'Big data y Ciencia de Datos',
  D12: 'Ciencia de Datos',
  D13: 'Logística Digital',
  D14: 'Modelado y Animación Digital',
};

@Injectable()
export class EstudiantesService {
  constructor(private readonly prisma: PrismaService) {}

  async preAdmitir(dto: PreAdmitirEstudianteDto) {
    const dni = dto.dni?.trim();
    if (!dni) {
      throw new BadRequestException('El DNI es obligatorio');
    }

    // 1. Validar si el DNI ya existe en la BD
    const existing = await this.prisma.estudiante.findUnique({
      where: { dni },
    });

    if (existing) {
      throw new HttpException(
        'El DNI ya se encuentra registrado',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Buscar o auto-crear la carrera en la BD respetando el código seleccionado
    const targetCarreraCodigo = (dto.carreraCodigo || 'C24').toUpperCase().trim();
    let carrera = await this.prisma.carrera.findUnique({
      where: { codigo: targetCarreraCodigo },
    });

    const nombreOficial =
      CARRERAS_TECSUP_OFICIALES[targetCarreraCodigo] ||
      dto.carreraNombre?.trim() ||
      `Carrera ${targetCarreraCodigo}`;

    if (!carrera) {
      carrera = await this.prisma.carrera.create({
        data: {
          codigo: targetCarreraCodigo,
          nombre: nombreOficial,
          sede: 'Lima - Santa Anita',
          totalCiclos: 6,
        },
      });
    } else if (carrera.nombre !== nombreOficial && CARRERAS_TECSUP_OFICIALES[targetCarreraCodigo]) {
      carrera = await this.prisma.carrera.update({
        where: { id: carrera.id },
        data: { nombre: nombreOficial },
      });
    }

    // 3. Resolver sección asignada (Fase 1: Opcional / Pendiente)
    let seccionId: string | null = null;
    const targetSeccionCodigo = (dto.seccionCodigo || dto.seccion || '').trim();
    if (
      targetSeccionCodigo &&
      targetSeccionCodigo !== 'PENDIENTE' &&
      targetSeccionCodigo !== 'Por Asignar'
    ) {
      let seccion = await this.prisma.seccion.findFirst({
        where: {
          carreraId: carrera.id,
          codigoSeccion: targetSeccionCodigo,
        },
      });

      if (!seccion) {
        seccion = await this.prisma.seccion.create({
          data: {
            carreraId: carrera.id,
            ciclo: 1,
            codigoSeccion: targetSeccionCodigo,
            periodo: '2027-1',
            aulaBase: `Pabellón ${carrera.codigo} - Aula 101`,
          },
        });
      }
      seccionId = seccion.id;
    }

    // 4. Hashear la clave inicial con bcrypt: su DNI por defecto
    const passwordHash = await bcrypt.hash(dni, 10);

    // 5. Correo Personal (Fase 1: contacto inicial, correoInstitucional = null)
    const correoPersonal =
      dto.correoPersonal?.trim() ||
      dto.email?.trim() ||
      null;
    const correoInstitucional = null; // Fase 1: Aún no activado

    // 6. Insertar en Prisma (Fase 1: Pre-admisión)
    const estudiante = await this.prisma.estudiante.create({
      data: {
        dni,
        passwordHash,
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        correoPersonal,
        correoInstitucional,
        telefono: dto.telefono?.trim() || null,
        carreraId: carrera.id,
        seccionId,
        cicloActual: 1,
        biometriaRegistrada: false,
        tokenBiometrico: null,
        pasoActualMatricula: 1,
        estadoMatricula: EstadoMatricula.NO_INICIADO,
        horarioLiberado: false, // Fase 1: Bloqueado
        fotoPerfilUrl:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
      },
      include: {
        carrera: true,
        seccion: true,
      },
    });

    const { passwordHash: _, tokenBiometrico: __, ...seguro } = estudiante;

    return {
      success: true,
      message: 'Estudiante pre-admitido exitosamente en Tecsup (Fase 1)',
      data: seguro,
    };
  }

  async obtenerTodos() {
    // Sincronizar en BD carreras con nombres desactualizados de seeds previos (ej: C12 o C14)
    try {
      const carrerasExistentes = await this.prisma.carrera.findMany({
        where: {
          codigo: { in: Object.keys(CARRERAS_TECSUP_OFICIALES) },
        },
      });
      for (const c of carrerasExistentes) {
        const nombreOficial = CARRERAS_TECSUP_OFICIALES[c.codigo];
        if (nombreOficial && c.nombre !== nombreOficial) {
          await this.prisma.carrera.update({
            where: { id: c.id },
            data: { nombre: nombreOficial },
          });
        }
      }
    } catch {
      // Continuar si la sincronización preventiva no puede ejecutarse
    }

    const estudiantes = await this.prisma.estudiante.findMany({
      include: {
        carrera: true,
        seccion: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const lista = estudiantes.map((e) => {
      let carrera = e.carrera;
      if (carrera && CARRERAS_TECSUP_OFICIALES[carrera.codigo]) {
        carrera = {
          ...carrera,
          nombre: CARRERAS_TECSUP_OFICIALES[carrera.codigo],
        };
      }

      return {
        id: e.id,
        dni: e.dni,
        nombres: e.nombres,
        apellidos: e.apellidos,
        correoInstitucional: e.correoInstitucional,
        correoPersonal: e.correoPersonal,
        telefono: e.telefono,
        estadoMatricula: e.estadoMatricula,
        biometriaRegistrada: e.biometriaRegistrada,
        horarioLiberado: e.horarioLiberado,
        pasoActualMatricula: e.pasoActualMatricula,
        carrera,
        seccion: e.seccion,
      };
    });

    return {
      success: true,
      data: lista,
    };
  }

  async obtenerPerfil(estudianteId: string) {
    const estudiante = await this.prisma.estudiante.findFirst({
      where: { OR: [{ id: estudianteId }, { dni: estudianteId }] },
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
    if (perfilSeguro.carrera && CARRERAS_TECSUP_OFICIALES[perfilSeguro.carrera.codigo]) {
      perfilSeguro.carrera.nombre = CARRERAS_TECSUP_OFICIALES[perfilSeguro.carrera.codigo];
    }

    return {
      success: true,
      data: perfilSeguro,
    };
  }

  async actualizarPasoMatricula(estudianteId: string, dto: ActualizarPasoDto) {
    const estudiante = await this.prisma.estudiante.findFirst({
      where: {
        OR: [{ id: estudianteId }, { dni: estudianteId }],
      },
      include: { carrera: true, seccion: true },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    let nuevoEstado = estudiante.estadoMatricula;
    let horarioLiberado = estudiante.horarioLiberado;
    let correoInstitucional = estudiante.correoInstitucional;
    let seccionId = estudiante.seccionId;

    // Si llega al paso final (8), se formaliza la matrícula (Fase 2)
    if (dto.paso >= 8) {
      nuevoEstado = EstadoMatricula.MATRICULADO_CONFIRMADO;
      horarioLiberado = true;
      if (!correoInstitucional) {
        correoInstitucional = generarCorreoInstitucional(
          estudiante.nombres,
          estudiante.apellidos,
        );
      }
      if (!seccionId) {
        let seccion1A = await this.prisma.seccion.findFirst({
          where: { carreraId: estudiante.carreraId, codigoSeccion: '1A' },
        });
        if (!seccion1A) {
          seccion1A = await this.prisma.seccion.create({
            data: {
              carreraId: estudiante.carreraId,
              ciclo: 1,
              codigoSeccion: '1A',
              periodo: '2027-1',
              aulaBase: `Pabellón ${estudiante.carrera.codigo} - Aula 101`,
            },
          });
        }
        seccionId = seccion1A.id;
      }
    } else if (dto.paso >= 6) {
      nuevoEstado = EstadoMatricula.MATRICULADO_CONFIRMADO;
      horarioLiberado = true;
    } else if (dto.paso === 5) {
      nuevoEstado = EstadoMatricula.PAGADO_PENDIENTE_HORARIO;
    } else if (estudiante.estadoMatricula === EstadoMatricula.NO_INICIADO && dto.paso > 1) {
      nuevoEstado = EstadoMatricula.EN_PROCESO;
    }

    const nuevoPaso = Math.max(estudiante.pasoActualMatricula ?? 1, dto.paso);

    const actualizado = await this.prisma.estudiante.update({
      where: { id: estudiante.id },
      data: {
        pasoActualMatricula: nuevoPaso,
        estadoMatricula: nuevoEstado,
        horarioLiberado,
        correoInstitucional,
        seccionId,
        ...(dto.biometriaRegistrada !== undefined && {
          biometriaRegistrada: dto.biometriaRegistrada,
        }),
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

  async actualizar(id: string, dto: ActualizarEstudianteDto) {
    const estudiante = await this.prisma.estudiante.findFirst({
      where: {
        OR: [{ id }, { dni: id }],
      },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const dataToUpdate: any = {};

    if (dto.nombres !== undefined) dataToUpdate.nombres = dto.nombres.trim();
    if (dto.apellidos !== undefined) dataToUpdate.apellidos = dto.apellidos.trim();
    if (dto.correoInstitucional !== undefined)
      dataToUpdate.correoInstitucional = dto.correoInstitucional.trim();
    if (dto.telefono !== undefined) dataToUpdate.telefono = dto.telefono.trim();
    if (dto.estadoMatricula !== undefined)
      dataToUpdate.estadoMatricula = dto.estadoMatricula;
    if (dto.biometriaRegistrada !== undefined)
      dataToUpdate.biometriaRegistrada = dto.biometriaRegistrada;
    if (dto.horarioLiberado !== undefined)
      dataToUpdate.horarioLiberado = dto.horarioLiberado;

    // Si cambia la carrera
    if (dto.carreraCodigo) {
      const codigo = dto.carreraCodigo.toUpperCase().trim();
      let carrera = await this.prisma.carrera.findUnique({
        where: { codigo },
      });
      const nombreOficial =
        CARRERAS_TECSUP_OFICIALES[codigo] || `Carrera ${codigo}`;
      if (!carrera) {
        carrera = await this.prisma.carrera.create({
          data: {
            codigo,
            nombre: nombreOficial,
            sede: 'Lima - Santa Anita',
            totalCiclos: 6,
          },
        });
      } else if (carrera.nombre !== nombreOficial && CARRERAS_TECSUP_OFICIALES[codigo]) {
        carrera = await this.prisma.carrera.update({
          where: { id: carrera.id },
          data: { nombre: nombreOficial },
        });
      }
      dataToUpdate.carreraId = carrera.id;
        const targetSeccion = (dto.seccionCodigo || dto.seccion || '1A').trim();
        let seccion =
          (await this.prisma.seccion.findFirst({
            where: { carreraId: carrera.id, codigoSeccion: targetSeccion },
          })) ||
          (await this.prisma.seccion.findFirst({
            where: { carreraId: carrera.id },
          }));

        if (!seccion) {
          seccion = await this.prisma.seccion.create({
            data: {
              carreraId: carrera.id,
              ciclo: 1,
              codigoSeccion: targetSeccion || '1A',
              periodo: '2027-1',
              aulaBase: `Pabellón ${carrera.codigo} - Aula 101`,
            },
          });
        }
        dataToUpdate.seccionId = seccion.id;
    } else if (dto.seccionCodigo || dto.seccion) {
      const targetSeccion = (dto.seccionCodigo || dto.seccion).trim();
      const seccion = await this.prisma.seccion.findFirst({
        where: { carreraId: estudiante.carreraId, codigoSeccion: targetSeccion },
      });
      if (seccion) {
        dataToUpdate.seccionId = seccion.id;
      }
    }

    const actualizado = await this.prisma.estudiante.update({
      where: { id: estudiante.id },
      data: dataToUpdate,
      include: {
        carrera: true,
        seccion: true,
      },
    });

    const { passwordHash: _, tokenBiometrico: __, ...seguro } = actualizado;
    if (seguro.carrera && CARRERAS_TECSUP_OFICIALES[seguro.carrera.codigo]) {
      seguro.carrera.nombre = CARRERAS_TECSUP_OFICIALES[seguro.carrera.codigo];
    }

    return {
      success: true,
      message: 'Estudiante actualizado exitosamente',
      data: seguro,
    };
  }

  async eliminar(id: string) {
    const estudiante = await this.prisma.estudiante.findFirst({
      where: {
        OR: [{ id }, { dni: id }],
      },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // 1. Eliminar pagos y dependencias asociadas
    await this.prisma.pago.deleteMany({
      where: { estudianteId: estudiante.id },
    });

    // 2. Eliminar el estudiante
    await this.prisma.estudiante.delete({
      where: { id: estudiante.id },
    });

    return {
      success: true,
      message: `Estudiante ${estudiante.nombres} ${estudiante.apellidos} (DNI ${estudiante.dni}) eliminado exitosamente`,
    };
  }

  async resetPassword(id: string) {
    const estudiante = await this.prisma.estudiante.findFirst({
      where: { OR: [{ id }, { dni: id }] },
    });
    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    const passwordHash = await bcrypt.hash(estudiante.dni, 10);
    await this.prisma.estudiante.update({
      where: { id: estudiante.id },
      data: { passwordHash },
    });
    return {
      success: true,
      message: `Contraseña restablecida exitosamente al DNI (${estudiante.dni})`,
    };
  }

  async resetBiometrics(id: string) {
    const estudiante = await this.prisma.estudiante.findFirst({
      where: { OR: [{ id }, { dni: id }] },
    });
    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    await this.prisma.estudiante.update({
      where: { id: estudiante.id },
      data: {
        biometriaRegistrada: false,
        tokenBiometrico: null,
      },
    });
    return {
      success: true,
      message: 'Registro biométrico reiniciado a PENDIENTE exitosamente',
    };
  }

  async releaseSchedule(id: string) {
    const estudiante = await this.prisma.estudiante.findFirst({
      where: { OR: [{ id }, { dni: id }] },
    });
    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    await this.prisma.estudiante.update({
      where: { id: estudiante.id },
      data: {
        horarioLiberado: true,
      },
    });
    return {
      success: true,
      message: 'Horario y vacante liberados exitosamente para el estudiante',
    };
  }

  async formalizarMatricula(id: string) {
    const estudiante = await this.prisma.estudiante.findFirst({
      where: { OR: [{ id }, { dni: id }] },
      include: { carrera: true, seccion: true },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // 1. Generar correo institucional formal (@tecsup.edu.pe)
    const correoInstitucional =
      estudiante.correoInstitucional ||
      generarCorreoInstitucional(estudiante.nombres, estudiante.apellidos);

    // 2. Asignar sección definitiva '1A' si estaba pendiente
    let seccionId = estudiante.seccionId;
    if (!seccionId) {
      let seccion1A = await this.prisma.seccion.findFirst({
        where: {
          carreraId: estudiante.carreraId,
          codigoSeccion: '1A',
        },
      });

      if (!seccion1A) {
        seccion1A = await this.prisma.seccion.create({
          data: {
            carreraId: estudiante.carreraId,
            ciclo: 1,
            codigoSeccion: '1A',
            periodo: '2027-1',
            aulaBase: `Pabellón ${estudiante.carrera.codigo} - Aula 101`,
          },
        });
      }
      seccionId = seccion1A.id;
    }

    // 3. Desbloquear horario y confirmar matrícula (Fase 2)
    const actualizado = await this.prisma.estudiante.update({
      where: { id: estudiante.id },
      data: {
        correoInstitucional,
        seccionId,
        horarioLiberado: true,
        estadoMatricula: EstadoMatricula.MATRICULADO_CONFIRMADO,
        pasoActualMatricula: 8,
      },
      include: {
        carrera: true,
        seccion: true,
      },
    });

    const { passwordHash: _, tokenBiometrico: __, ...seguro } = actualizado;

    return {
      success: true,
      message:
        'Matrícula formalizada exitosamente. Correo institucional generado y horario habilitado (Fase 2).',
      data: seguro,
    };
  }

  async importarEstudiantesMasivo(
    estudiantesDto: ImportEstudianteDto[],
  ): Promise<ImportarEstudiantesResultado> {
    const totalRecibidos = estudiantesDto.length;
    if (totalRecibidos === 0) {
      return {
        totalRecibidos: 0,
        insertados: 0,
        omitidosPorDuplicado: 0,
        fallidos: 0,
        errores: [],
      };
    }

    // a. Carga en memoria: Obtener todas las carreras disponibles en un Map (codigo -> id)
    const carreras = await this.prisma.carrera.findMany({
      select: { id: true, codigo: true, nombre: true },
    });
    const carreraMap = new Map<string, string>();
    for (const c of carreras) {
      carreraMap.set(c.codigo.toUpperCase().trim(), c.id);
      carreraMap.set(c.nombre.toUpperCase().trim(), c.id);
    }

    // b. Deduplicación O(1): Obtener todos los DNIs ya existentes en la BD
    const existingDnisList = await this.prisma.estudiante.findMany({
      select: { dni: true },
    });
    const existingDniSet = new Set<string>();
    for (const item of existingDnisList) {
      existingDniSet.add(item.dni.trim());
    }

    const errores: Array<{ fila: number; motivo: string }> = [];
    let omitidosPorDuplicado = 0;

    // c. Filtrado y Limpieza
    interface ItemValidado {
      dni: string;
      nombres: string;
      apellidos: string;
      correoPersonal: string | null;
      telefono: string | null;
      carreraId: string;
    }

    const preValidados: ItemValidado[] = [];

    for (let i = 0; i < estudiantesDto.length; i++) {
      const filaNumero = i + 1;
      const fila = estudiantesDto[i];

      // 1. Trimear y formatear DNI a 8 dígitos
      const rawDni = String(fila.dni || '').replace(/\D/g, '').trim();
      const cleanDni = rawDni.padStart(8, '0');

      if (!cleanDni || cleanDni.length !== 8 || cleanDni === '00000000') {
        errores.push({
          fila: filaNumero,
          motivo: `DNI inválido ('${fila.dni}'). Debe contener hasta 8 dígitos numéricos.`,
        });
        continue;
      }

      // 2. Comprobar si ya existe en la BD o en este lote
      if (existingDniSet.has(cleanDni)) {
        omitidosPorDuplicado++;
        continue;
      }

      // 3. Validar nombres y apellidos con desacoplamiento inteligente y resiliente
      let nombres = String(fila.nombres || (fila as any).nombre || '').trim();
      let apellidos = String(fila.apellidos || (fila as any).apellido || '').trim();

      if (!apellidos && nombres.includes(' ')) {
        const tokens = nombres.split(/\s+/).filter(Boolean);
        if (tokens.length >= 2) {
          const splitIndex = tokens.length > 3 ? 2 : 1;
          nombres = tokens.slice(0, splitIndex).join(' ');
          apellidos = tokens.slice(splitIndex).join(' ');
        }
      } else if (!nombres && apellidos.includes(' ')) {
        const tokens = apellidos.split(/\s+/).filter(Boolean);
        if (tokens.length >= 2) {
          const splitIndex = tokens.length > 3 ? 2 : 1;
          nombres = tokens.slice(0, splitIndex).join(' ');
          apellidos = tokens.slice(splitIndex).join(' ');
        }
      }

      if (!nombres) {
        errores.push({
          fila: filaNumero,
          motivo: 'Nombres y apellidos son obligatorios.',
        });
        continue;
      }
      if (!apellidos) {
        apellidos = nombres;
      }

      // 4. Extraer el código de carrera (ej: de 'C24 - Diseño y Desarrollo...' tomar 'C24')
      let rawCarrera = String(fila.carreraCodigo || fila.carrera || 'C24').toUpperCase().trim();
      if (rawCarrera.includes('-')) {
        rawCarrera = rawCarrera.split('-')[0].trim();
      } else if (rawCarrera.includes(' ')) {
        rawCarrera = rawCarrera.split(' ')[0].trim();
      }

      let carreraId = carreraMap.get(rawCarrera);

      // Fallback: coincidencia por nombre de carrera si no se detectó por código
      if (!carreraId) {
        const carreraEncontrada = carreras.find(c => 
          c.nombre.toUpperCase().includes(rawCarrera) || 
          String(fila.carrera || fila.carreraCodigo || '').toUpperCase().includes(c.nombre.toUpperCase())
        );
        if (carreraEncontrada) {
          carreraId = carreraEncontrada.id;
        }
      }

      if (!carreraId) {
        let carreraExistente = await this.prisma.carrera.findUnique({
          where: { codigo: rawCarrera },
        });
        const nombreOficial =
          CARRERAS_TECSUP_OFICIALES[rawCarrera] || `Carrera ${rawCarrera}`;
        if (!carreraExistente) {
          carreraExistente = await this.prisma.carrera.create({
            data: {
              codigo: rawCarrera,
              nombre: nombreOficial,
              sede: 'Lima - Santa Anita',
              totalCiclos: 6,
            },
          });
        } else if (carreraExistente.nombre !== nombreOficial && CARRERAS_TECSUP_OFICIALES[rawCarrera]) {
          carreraExistente = await this.prisma.carrera.update({
            where: { id: carreraExistente.id },
            data: { nombre: nombreOficial },
          });
        }
        carreraId = carreraExistente.id;
        carreraMap.set(rawCarrera, carreraId);
      }

      // Registrar DNI como visto en el lote para deduplicar filas repetidas en el mismo archivo
      existingDniSet.add(cleanDni);

      const correoPersonal =
        String(fila.correoPersonal || fila.email || '').toLowerCase().trim() || null;
      const telefono = String(fila.telefono || '').trim() || null;

      preValidados.push({
        dni: cleanDni,
        nombres,
        apellidos,
        correoPersonal,
        telefono,
        carreraId,
      });
    }

    // d. Generación de Hashes controlada en chunks asíncronos de 30 en 30
    const CHUNK_SIZE = 30;
    const validosParaInsertar: Array<{
      dni: string;
      passwordHash: string;
      nombres: string;
      apellidos: string;
      correoPersonal: string | null;
      correoInstitucional: string | null;
      telefono: string | null;
      carreraId: string;
      seccionId: null;
      cicloActual: number;
      biometriaRegistrada: boolean;
      pasoActualMatricula: number;
      estadoMatricula: EstadoMatricula;
      horarioLiberado: boolean;
      fotoPerfilUrl: string;
    }> = [];

    for (let i = 0; i < preValidados.length; i += CHUNK_SIZE) {
      const chunk = preValidados.slice(i, i + CHUNK_SIZE);
      const hashedChunk = await Promise.all(
        chunk.map(async (item) => {
          const passwordHash = await bcrypt.hash(item.dni, 10);
          return {
            dni: item.dni,
            passwordHash,
            nombres: item.nombres,
            apellidos: item.apellidos,
            correoPersonal: item.correoPersonal,
            correoInstitucional: null,
            telefono: item.telefono,
            carreraId: item.carreraId,
            seccionId: null,
            cicloActual: 1,
            biometriaRegistrada: false,
            pasoActualMatricula: 1,
            estadoMatricula: EstadoMatricula.NO_INICIADO,
            horarioLiberado: false,
            fotoPerfilUrl:
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
          };
        }),
      );
      validosParaInsertar.push(...hashedChunk);

      // Ceder el Event Loop entre chunks para procesar I/O y evitar bloqueos
      await new Promise((resolve) => setImmediate(resolve));
    }

    // e. Inserción Masiva en PostgreSQL con skipDuplicates
    let insertados = 0;
    if (validosParaInsertar.length > 0) {
      const result = await this.prisma.estudiante.createMany({
        data: validosParaInsertar,
        skipDuplicates: true,
      });
      insertados = result.count;
    }

    // f. Retornar resumen métrico
    return {
      totalRecibidos,
      insertados,
      omitidosPorDuplicado,
      fallidos: errores.length,
      errores,
    };
  }
}
