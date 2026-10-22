import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  COLA_ENTRADA,
  CorreoRecibido,
  EXCHANGE_CORREOS,
  MensajeEntrada,
  OPCIONES_COLA_ENTRADA,
  RK_ENTRADA,
} from '@app/shared';

/**
 * Consumidor de la cola "correos.entrada".
 * Guarda cada correo recibido una sola vez (se compara el Message-ID).
 */
@Injectable()
export class EntradaConsumer {
  private readonly logger = new Logger('ConsumidorEntrada');

  constructor(
    @InjectRepository(CorreoRecibido)
    private readonly repo: Repository<CorreoRecibido>,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGE_CORREOS,
    routingKey: RK_ENTRADA,
    queue: COLA_ENTRADA,
    queueOptions: OPCIONES_COLA_ENTRADA,
  })
  async procesar(mensaje: MensajeEntrada): Promise<Nack | void> {
    this.logger.log(`[CONSUMIDO] "${mensaje.asunto}" de ${mensaje.remitente} desde "${COLA_ENTRADA}"`);

    try {
      const existe = await this.repo.exists({ where: { messageId: mensaje.messageId } });
      if (existe) {
        this.logger.log(`[DUPLICADO] ${mensaje.messageId} ya estaba guardado; se descarta`);
        return; // ack: no hay nada más que hacer
      }

      const guardado = await this.repo.save(
        this.repo.create({
          messageId: mensaje.messageId,
          remitente: mensaje.remitente,
          destinatario: mensaje.destinatario,
          asunto: mensaje.asunto,
          texto: mensaje.texto,
          html: mensaje.html,
          fecha: new Date(mensaje.fecha),
        }),
      );
      this.logger.log(`[GUARDADO] Correo recibido #${guardado.id} "${guardado.asunto}"`);
      return; // ack
    } catch (err) {
      const detalle = (err as Error).message;
      // Si dos mensajes iguales llegaron casi al mismo tiempo, el índice único lo detecta.
      if (detalle.includes('UNIQUE')) {
        this.logger.log(`[DUPLICADO] ${mensaje.messageId} ya estaba guardado; se descarta`);
        return;
      }
      this.logger.error(`[ERROR] No se pudo guardar "${mensaje.asunto}": ${detalle}`);
      // Reencola para intentarlo de nuevo (por ejemplo, si la base estaba bloqueada).
      return new Nack(true);
    }
  }
}
