import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CorreoEnviado, CrearCorreoDto } from '@app/shared';
import { CorreosService } from './correos.service';

@Controller()
export class CorreosController {
  constructor(private readonly correosService: CorreosService) {}

  /**
   * POST /api/correos
   * Guarda el correo con estado "en_cola", lo publica en RabbitMQ y responde
   * de inmediato con 202 (Accepted): el envío real lo hace el worker.
   */
  @Post('correos')
  @HttpCode(HttpStatus.ACCEPTED)
  crear(@Body() dto: CrearCorreoDto): Promise<CorreoEnviado> {
    return this.correosService.crear(dto);
  }

  /** GET /api/enviados → correos enviados con su estado (más recientes primero). */
  @Get('enviados')
  listarEnviados(): Promise<CorreoEnviado[]> {
    return this.correosService.listarEnviados();
  }
}
