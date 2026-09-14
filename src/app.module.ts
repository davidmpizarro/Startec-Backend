import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EstudiantesModule } from './estudiantes/estudiantes.module';
import { MatriculaModule } from './matricula/matricula.module';
import { HorariosModule } from './horarios/horarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    EstudiantesModule,
    MatriculaModule,
    HorariosModule,
  ],
})
export class AppModule {}
