import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  dni: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'startec_super_secret_jwt_key_2026',
    });
  }

  async validate(payload: JwtPayload) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: payload.sub },
      include: {
        carrera: true,
        seccion: true,
      },
    });

    if (!estudiante) {
      throw new UnauthorizedException('Estudiante no encontrado o token inválido');
    }

    const { passwordHash, ...safeEstudiante } = estudiante;
    return safeEstudiante;
  }
}
