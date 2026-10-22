import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CorreoRecibido } from '@app/shared';
import { BandejaService } from './bandeja.service';

@Controller('bandeja')
export class BandejaController {
  constructor(private readonly bandejaService: BandejaService) {}

  /** GET /api/bandeja → correos recibidos (más recientes primero). */
  @Get()
  listar(): Promise<CorreoRecibido[]> {
    return this.bandejaService.listar();
  }

  /** GET /api/bandeja/:id → detalle de un correo recibido. */
  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number): Promise<CorreoRecibido> {
    return this.bandejaService.detalle(id);
  }
}
