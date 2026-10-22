import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Punto de entrada de la API REST.
 * La API nunca envía ni lee correos: solo guarda en la base de datos
 * y publica mensajes en RabbitMQ.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('API');

  // Todas las rutas quedan bajo /api (ej: /api/correos).
  app.setGlobalPrefix('api');

  // CORS para que el frontend (Next.js) pueda llamar a la API desde el navegador.
  app.enableCors({
    origin: (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(','),
  });

  // Valida y transforma automáticamente los DTOs con class-validator / class-transformer.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Cierra bien las conexiones (RabbitMQ, SQLite) al detener el proceso.
  app.enableShutdownHooks();

  const puerto = Number(process.env.API_PORT ?? 3001);
  await app.listen(puerto);
  logger.log(`API escuchando en http://localhost:${puerto}/api`);
}

bootstrap();
