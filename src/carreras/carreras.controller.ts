import { Controller, Get, Param } from '@nestjs/common';
import { CarrerasService } from './carreras.service';

@Controller('carreras')
export class CarrerasController {
  constructor(private readonly carrerasService: CarrerasService) {}

  @Get()
  listarCarreras() {
    return this.carrerasService.listarCarreras();
  }

  @Get(':id')
  obtenerCarreraPorId(@Param('id') id: string) {
    return this.carrerasService.obtenerCarreraPorId(id);
  }
}
