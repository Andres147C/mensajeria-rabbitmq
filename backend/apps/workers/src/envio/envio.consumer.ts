import { AmqpConnection, Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ConsumeMessage } from 'amqplib';
import { Repository } from 'typeorm';
import {
  COLA_FALLIDOS,
  COLA_SALIDA,
  CorreoEnviado,
  EXCHANGE_CORREOS,
  EstadoCorreo,
  HEADER_INTENTO,
  MAX_REINTENTOS,
  MensajeSalida,
  OPCIONES_COLA_SALIDA,
  RK_SALIDA,
} from '@app/shared';
import { SmtpService } from './smtp.service';

/** Pausa simple para espaciar los reintentos. */
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Consumidor de la cola "correos.salida".
 *
 * Flujo de confirmación (ack/nack manual):
 *  - Envío correcto           → estado "enviado" y ack.
 *  - Falla y quedan reintentos → se vuelve a publicar con la cabecera x-intento + 1 y ack del original.
 *  - Falla sin reintentos      → estado "error" y nack(requeue=false): RabbitMQ lo manda
 *                                al dead letter exchange y queda en "correos.fallidos".
 */
@Injectable()
export class EnvioConsumer {
  private readonly logger = new Logger('ConsumidorEnvio');

  constructor(
    private readonly smtp: SmtpService,
    private readonly amqp: AmqpConnection,
    @InjectRepository(CorreoEnviado)
    private readonly repo: Repository<CorreoEnviado>,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGE_CORREOS,
    routingKey: RK_SALIDA,
    queue: COLA_SALIDA,
    queueOptions: OPCIONES_COLA_SALIDA,
  })
  async procesar(mensaje: MensajeSalida, amqpMsg: ConsumeMessage): Promise<Nack | void> {
    // Intento actual (0 = primer intento, 1..3 = reintentos)
    const intento = Number(amqpMsg.properties.headers?.[HEADER_INTENTO] ?? 0);
    const etiqueta = `Correo #${mensaje.correoId} (intento ${intento + 1} de ${MAX_REINTENTOS + 1})`;

    this.logger.log(`[CONSUMIDO] ${etiqueta} desde "${COLA_SALIDA}" para ${mensaje.para}`);

    try {
      const messageId = await this.smtp.enviar(mensaje);

      await this.repo.update(mensaje.correoId, {
        estado: EstadoCorreo.ENVIADO,
        intentos: intento + 1,
        error: null,
        messageId,
        enviadoEn: new Date(),
      });
      this.logger.log(`[ENVIADO] ${etiqueta} entregado a Gmail SMTP (Message-ID ${messageId})`);
      return; // ack
    } catch (err) {
      const detalle = (err as Error).message ?? String(err);
      this.logger.warn(`[FALLO] ${etiqueta}: ${detalle}`);

      if (intento < MAX_REINTENTOS) {
        await this.repo.update(mensaje.correoId, { intentos: intento + 1, error: detalle });

        // Espera progresiva (2 s, 4 s, 6 s) antes de reencolar.
        const espera = (intento + 1) * 2000;
        await esperar(espera);
        await this.amqp.publish(EXCHANGE_CORREOS, RK_SALIDA, mensaje, {
          persistent: true,
          contentType: 'application/json',
          headers: { [HEADER_INTENTO]: intento + 1 },
        });
        this.logger.log(
          `[REINTENTO] Correo #${mensaje.correoId} publicado de nuevo (reintento ${intento + 1} de ${MAX_REINTENTOS})`,
        );
        return; // ack del mensaje original: ya hay una copia nueva en la cola
      }

      // Sin más reintentos: marcar error y enviar a la dead letter queue.
      await this.repo.update(mensaje.correoId, {
        estado: EstadoCorreo.ERROR,
        intentos: intento + 1,
        error: detalle,
      });
      this.logger.error(
        `[ERROR] Correo #${mensaje.correoId} falló ${intento + 1} veces → enviado a "${COLA_FALLIDOS}"`,
      );
      return new Nack(false); // nack sin reencolar → dead letter
    }
  }
}
