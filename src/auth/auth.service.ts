import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterBiometricDto } from './dto/register-biometric.dto';
import { BiometricLoginDto } from './dto/biometric-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { dni, password } = loginDto;

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { dni },
      include: {
        carrera: true,
        seccion: true,
      },
    });

    if (!estudiante) {
      throw new UnauthorizedException('Credenciales inválidas: DNI no registrado');
    }

    // Verificar si coincide con el hash guardado o con su propio DNI (clave inicial)
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
        carrera: true,
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
      where: { dni },
      include: {
        carrera: true,
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
