import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EstudiantesModule } from './estudiantes/estudiantes.module';
import { MatriculaModule } from './matricula/matricula.module';
import { HorariosModule } from './horarios/horarios.module';
import { CarrerasModule } from './carreras/carreras.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentosModule } from './documentos/documentos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Sirve los archivos subidos en /uploads/** de forma pública
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,   // No servir index.html
        fallthrough: false,
      },
    }),
    PrismaModule,
    CarrerasModule,
    AuthModule,
    EstudiantesModule,
    MatriculaModule,
    HorariosModule,
    DashboardModule,
    DocumentosModule,
  ],
})
export class AppModule {}

