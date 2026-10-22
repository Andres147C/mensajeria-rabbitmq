import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorreoEnviado } from '@app/shared';
import { CorreosController } from './correos.controller';
import { CorreosService } from './correos.service';

/** Envío de correos: recibe la petición del frontend y la publica en RabbitMQ. */
@Module({
  imports: [TypeOrmModule.forFeature([CorreoEnviado])],
  controllers: [CorreosController],
  providers: [CorreosService],
})
export class CorreosModule {}
