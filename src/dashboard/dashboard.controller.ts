import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller(['dashboard', 'metrics'])
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metricas')
  obtenerMetricas() {
    return this.dashboardService.obtenerMetricas();
  }

  @Get('dashboard')
  obtenerDashboard() {
    return this.dashboardService.obtenerMetricas();
  }

  @Get()
  obtenerRaiz() {
    return this.dashboardService.obtenerMetricas();
  }
}
