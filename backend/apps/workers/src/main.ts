import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkersModule } from './workers.module';

/**
 * Punto de entrada de los workers. No levanta un servidor HTTP:
 * solo consume colas de RabbitMQ y ejecuta el lector IMAP programado.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkersModule);
  app.enableShutdownHooks();
  new Logger('Workers').log(
    'Workers iniciados: consumidor de envío, consumidor de entrada y lector IMAP (cada 30 s)',
  );
}

bootstrap();
