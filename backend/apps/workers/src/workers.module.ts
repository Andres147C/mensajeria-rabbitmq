import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule, RabbitMQConfigModule } from '@app/shared';
import { EntradaModule } from './entrada/entrada.module';
import { EnvioModule } from './envio/envio.module';
import { ImapModule } from './imap/imap.module';

/** Módulo raíz de los workers. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RabbitMQConfigModule,
    EnvioModule,
    ImapModule,
    EntradaModule,
  ],
})
export class WorkersModule {}
