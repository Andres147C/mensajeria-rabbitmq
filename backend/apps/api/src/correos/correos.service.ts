import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CorreoEnviado,
  CrearCorreoDto,
  EXCHANGE_CORREOS,
  EstadoCorreo,
  HEADER_INTENTO,
  MensajeSalida,
  RK_SALIDA,
} from '@app/shared';

@Injectable()
export class CorreosService {
  private readonly logger = new Logger('CorreosService');

  constructor(
    @InjectRepository(CorreoEnviado)
    private readonly repo: Repository<CorreoEnviado>,
    private readonly amqp: AmqpConnection,
  ) {}

  /** Guarda el correo como "en_cola" y lo publica en el exchange "correos" con routing key "salida". */
  async crear(dto: CrearCorreoDto): Promise<CorreoEnviado> {
    // 0. Si no hay conexión con RabbitMQ respondemos de inmediato
    //    (si no, la publicación quedaría esperando a que el broker vuelva).
    if (!this.amqp.connected) {
      this.logger.error('[ERROR] RabbitMQ no está conectado: el correo no se encola');
      throw new ServiceUnavailableException(
        'RabbitMQ no está disponible. Revisa que el contenedor esté levantado.',
      );
    }

    // 1. Guardar en la base de datos
    const correo = await this.repo.save(
      this.repo.create({ ...dto, estado: EstadoCorreo.EN_COLA, intentos: 0 }),
    );

    // 2. Publicar en RabbitMQ (mensaje persistente: sobrevive a un reinicio del broker)
    const mensaje: MensajeSalida = {
      correoId: correo.id,
      para: correo.para,
      asunto: correo.asunto,
      mensaje: correo.mensaje,
    };

    try {
      await this.amqp.publish(EXCHANGE_CORREOS, RK_SALIDA, mensaje, {
        persistent: true,
        contentType: 'application/json',
        headers: { [HEADER_INTENTO]: 0 },
      });
      this.logger.log(
        `[PUBLICADO] Correo #${correo.id} para ${correo.para} → exchange "${EXCHANGE_CORREOS}", routing key "${RK_SALIDA}"`,
      );
    } catch (err) {
      // Si RabbitMQ no está disponible, el correo queda marcado con error.
      const detalle = err instanceof Error ? err.message : String(err);
      this.logger.error(`[ERROR] No se pudo publicar el correo #${correo.id}: ${detalle}`);
      await this.repo.update(correo.id, {
        estado: EstadoCorreo.ERROR,
        error: `No se pudo publicar en RabbitMQ: ${detalle}`,
      });
      throw new ServiceUnavailableException(
        'RabbitMQ no está disponible. Inténtalo de nuevo en unos segundos.',
      );
    }

    return correo;
  }

  listarEnviados(): Promise<CorreoEnviado[]> {
    return this.repo.find({ order: { creadoEn: 'DESC', id: 'DESC' } });
  }
}
