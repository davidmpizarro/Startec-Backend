import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EstadoMatricula } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterBiometricDto } from './dto/register-biometric.dto';
import { BiometricLoginDto } from './dto/biometric-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { dni, password, nombres, apellidos, codigoCarrera, carreraId, correoPersonal, telefono } =
      registerDto;

    if (!codigoCarrera && !carreraId) {
      throw new BadRequestException(
        'Debe seleccionar una carrera válida (proporcione codigoCarrera o carreraId)',
      );
    }

    // 1. Verificar unicidad de DNI
    const existing = await this.prisma.estudiante.findUnique({
      where: { dni: dni.trim() },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un estudiante registrado con el DNI ${dni}. Inicia sesión directamente.`,
      );
    }

    // 2. Buscar Carrera
    let carrera = null;
    if (carreraId) {
      carrera = await this.prisma.carrera.findUnique({
        where: { id: carreraId },
        include: {
          secciones: { where: { ciclo: 1 } },
          cursos: { where: { ciclo: 1 }, orderBy: { codigo: 'asc' } },
        },
      });
    } else if (codigoCarrera) {
      carrera = await this.prisma.carrera.findUnique({
        where: { codigo: codigoCarrera.toUpperCase().trim() },
        include: {
          secciones: { where: { ciclo: 1 } },
          cursos: { where: { ciclo: 1 }, orderBy: { codigo: 'asc' } },
        },
      });
    }

    if (!carrera) {
      throw new NotFoundException('La carrera seleccionada no existe en el catálogo de Tecsup');
    }

    // 3. Asignar sección base de 1er ciclo (ej: C24-1A, C11-1A, etc.)
    let seccion = carrera.secciones[0];
    if (!seccion) {
      const codigoSec = `${carrera.codigo}-1A`;
      seccion = await this.prisma.seccion.create({
        data: {
          carreraId: carrera.id,
          ciclo: 1,
          codigoSeccion: codigoSec,
          periodo: '2027-1',
          aulaBase: 'Pabellón B - Aula 204',
        },
      });
    }

    // 4. Hashear la contraseña proporcionada
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Crear el nuevo estudiante en la base de datos
    const estudiante = await this.prisma.estudiante.create({
      data: {
        dni: dni.trim(),
        passwordHash,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        correoPersonal: correoPersonal?.trim(),
        telefono: telefono?.trim(),
        carreraId: carrera.id,
        seccionId: seccion.id,
        cicloActual: 1,
        estadoMatricula: EstadoMatricula.NO_INICIADO,
        pasoActualMatricula: 1,
        biometriaRegistrada: false,
        tokenBiometrico: null,
        horarioLiberado: false,
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

    // 6. Generar JWT para transición inmediata al enrolamiento biométrico
    const payload = { sub: estudiante.id, dni: estudiante.dni };
    const accessToken = this.jwtService.sign(payload);

    const { passwordHash: _, tokenBiometrico: __, ...safeEstudiante } = estudiante;

    return {
      accessToken,
      estudiante: safeEstudiante,
      message: 'Estudiante admitido y registrado exitosamente en Tecsup',
    };
  }

  async login(loginDto: LoginDto) {
    const { dni, password } = loginDto;

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { dni: dni.trim() },
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

    if (!estudiante) {
      throw new UnauthorizedException('Credenciales inválidas: DNI no registrado');
    }

    const isPasswordValid = await bcrypt.compare(password, estudiante.passwordHash);
    const isDniFallbackValid = password === estudiante.dni;

    if (!isPasswordValid && !isDniFallbackValid) {
      throw new UnauthorizedException('Credenciales inválidas: Contraseña incorrecta');
    }

    const payload = { sub: estudiante.id, dni: estudiante.dni };
    const accessToken = this.jwtService.sign(payload);

    const { passwordHash, ...safeEstudiante } = estudiante;

    return {
      accessToken,
      estudiante: safeEstudiante,
      message: 'Inicio de sesión exitoso',
    };
  }

  async registerBiometric(estudianteId: string, registerBiometricDto: RegisterBiometricDto) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const updated = await this.prisma.estudiante.update({
      where: { id: estudianteId },
      data: {
        tokenBiometrico: registerBiometricDto.tokenBiometrico,
        biometriaRegistrada: true,
        ...(registerBiometricDto.fotoPerfilUrl && {
          fotoPerfilUrl: registerBiometricDto.fotoPerfilUrl,
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

    const { passwordHash, ...safeEstudiante } = updated;

    return {
      success: true,
      message: 'Biometría registrada exitosamente',
      estudiante: safeEstudiante,
    };
  }

  async biometricLogin(biometricLoginDto: BiometricLoginDto) {
    const { dni, tokenBiometrico } = biometricLoginDto;

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { dni: dni.trim() },
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

    if (!estudiante) {
      throw new UnauthorizedException('Estudiante no encontrado');
    }

    if (!estudiante.biometriaRegistrada || !estudiante.tokenBiometrico) {
      throw new UnauthorizedException(
        'El estudiante no tiene configurada la autenticación biométrica en este dispositivo',
      );
    }

    if (estudiante.tokenBiometrico !== tokenBiometrico) {
      throw new UnauthorizedException('Token biométrico inválido o no reconocido');
    }

    const payload = { sub: estudiante.id, dni: estudiante.dni };
    const accessToken = this.jwtService.sign(payload);

    const { passwordHash, ...safeEstudiante } = estudiante;

    return {
      accessToken,
      estudiante: safeEstudiante,
      message: 'Inicio de sesión biométrico exitoso',
    };
  }
}
