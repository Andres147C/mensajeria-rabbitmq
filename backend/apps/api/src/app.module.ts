import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, RabbitMQConfigModule } from '@app/shared';
import { BandejaModule } from './bandeja/bandeja.module';
import { CorreosModule } from './correos/correos.module';

/** Módulo raíz de la API. */
@Module({
  imports: [
    // Lee las variables de backend/.env
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    RabbitMQConfigModule,
    CorreosModule,
    BandejaModule,
  ],
})
export class AppModule {}
