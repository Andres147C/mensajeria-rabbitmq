import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  COLA_ENTRADA,
  COLA_FALLIDOS,
  COLA_SALIDA,
  EXCHANGE_CORREOS,
  EXCHANGE_FALLIDOS,
  OPCIONES_COLA_ENTRADA,
  OPCIONES_COLA_SALIDA,
  RK_ENTRADA,
  RK_FALLIDOS,
  RK_SALIDA,
} from './rabbitmq.constants';

/**
 * Configura la conexión a RabbitMQ y declara explícitamente la topología:
 *
 *   exchange "correos" (direct)
 *     ├─ routing key "salida"  → cola "correos.salida"  (DLX → correos.dlx)
 *     └─ routing key "entrada" → cola "correos.entrada"
 *
 *   exchange "correos.dlx" (direct)
 *     └─ routing key "fallidos" → cola "correos.fallidos"
 *
 * Lo importan tanto la api como los workers, así cualquiera de los dos
 * que arranque primero deja creadas las colas.
 */
@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
        exchanges: [
          { name: EXCHANGE_CORREOS, type: 'direct', options: { durable: true } },
          { name: EXCHANGE_FALLIDOS, type: 'direct', options: { durable: true } },
        ],
        queues: [
          {
            name: COLA_SALIDA,
            exchange: EXCHANGE_CORREOS,
            routingKey: RK_SALIDA,
            options: OPCIONES_COLA_SALIDA,
          },
          {
            name: COLA_ENTRADA,
            exchange: EXCHANGE_CORREOS,
            routingKey: RK_ENTRADA,
            options: OPCIONES_COLA_ENTRADA,
          },
          {
            name: COLA_FALLIDOS,
            exchange: EXCHANGE_FALLIDOS,
            routingKey: RK_FALLIDOS,
            options: { durable: true },
          },
        ],
        // Procesa de a un mensaje por consumidor: hasta que no hace ack no recibe otro.
        prefetchCount: 1,
        // No bloquea el arranque si RabbitMQ aún no está disponible: se reconecta solo.
        connectionInitOptions: { wait: false },
      }),
    }),
  ],
  exports: [RabbitMQModule],
})
export class RabbitMQConfigModule {}
