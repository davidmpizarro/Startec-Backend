import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { DocumentosService } from './documentos.service';
import { ObservarDocumentoDto } from './dto/observar-documento.dto';

@Controller()
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // POST /estudiantes/documentos
  // Recibe multipart/form-data con campos: 'dni', 'certificado', 'cartaCompromiso'
  // y el campo de texto 'estudianteId'.
  // ──────────────────────────────────────────────────────────────────────────
  @Post('estudiantes/documentos')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'dni', maxCount: 1 },
      { name: 'certificado', maxCount: 1 },
      { name: 'cartaCompromiso', maxCount: 1 },
    ]),
  )
  async subirDocumentos(
    @UploadedFiles()
    files: {
      dni?: Express.Multer.File[];
      certificado?: Express.Multer.File[];
      cartaCompromiso?: Express.Multer.File[];
    },
    @Body('estudianteId') estudianteId: string,
    @Req() req: Request,
  ) {
    if (!estudianteId) {
      throw new BadRequestException(
        'El campo "estudianteId" es requerido en el body del FormData.',
      );
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.documentosService.subirDocumentos(estudianteId, files ?? {}, baseUrl);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /estudiantes/:estudianteId/documentos
  // Consulta expediente y documentos del estudiante con estado global
  // ──────────────────────────────────────────────────────────────────────────
  @Get('estudiantes/:estudianteId/documentos')
  @HttpCode(HttpStatus.OK)
  obtenerDocumentosPorEstudiante(@Param('estudianteId') estudianteId: string) {
    return this.documentosService.obtenerDocumentosPorEstudiante(estudianteId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /admin/documentos
  // Panel Admin: retorna todos los postulantes con sus documentos.
  // ──────────────────────────────────────────────────────────────────────────
  @Get('admin/documentos')
  @HttpCode(HttpStatus.OK)
  getDocumentosAdmin() {
    return this.documentosService.getDocumentosAdmin();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /admin/documentos/:documentoId/aprobar
  // ──────────────────────────────────────────────────────────────────────────
  @Patch('admin/documentos/:documentoId/aprobar')
  @HttpCode(HttpStatus.OK)
  aprobarDocumento(@Param('documentoId') documentoId: string) {
    return this.documentosService.aprobarDocumento(documentoId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /admin/documentos/:documentoId/observar
  // Body: { "motivo": "El documento está borroso..." }
  // ──────────────────────────────────────────────────────────────────────────
  @Patch('admin/documentos/:documentoId/observar')
  @HttpCode(HttpStatus.OK)
  observarDocumento(
    @Param('documentoId') documentoId: string,
    @Body() dto: ObservarDocumentoDto,
  ) {
    return this.documentosService.observarDocumento(documentoId, dto.motivo);
  }
}
