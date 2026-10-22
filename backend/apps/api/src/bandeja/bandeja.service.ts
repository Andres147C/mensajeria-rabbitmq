import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorreoRecibido } from '@app/shared';

@Injectable()
export class BandejaService {
  constructor(
    @InjectRepository(CorreoRecibido)
    private readonly repo: Repository<CorreoRecibido>,
  ) {}

  /** Lista los correos recibidos. No incluye el HTML para que la respuesta sea liviana. */
  listar(): Promise<CorreoRecibido[]> {
    return this.repo.find({
      select: {
        id: true,
        messageId: true,
        remitente: true,
        destinatario: true,
        asunto: true,
        texto: true,
        fecha: true,
        recibidoEn: true,
      },
      order: { fecha: 'DESC', id: 'DESC' },
    });
  }

  async detalle(id: number): Promise<CorreoRecibido> {
    const correo = await this.repo.findOne({ where: { id } });
    if (!correo) {
      throw new NotFoundException(`No existe el correo recibido con id ${id}`);
    }
    return correo;
  }
}
