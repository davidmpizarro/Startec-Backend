import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'documentos');

// Asegurar que la carpeta exista al arrancar
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB por archivo
      },
      fileFilter: (_req, file, cb) => {
        const allowedExts = /\.(pdf|jpg|jpeg|png|docx)$/i;
        if (allowedExts.test(file.originalname)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              `Formato no permitido: ${extname(file.originalname)}. Usa PDF, JPG, PNG o DOCX.`,
            ),
            false,
          );
        }
      },
    }),
  ],
  controllers: [DocumentosController],
  providers: [DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}

