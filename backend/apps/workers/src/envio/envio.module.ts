import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorreoEnviado } from '@app/shared';
import { EnvioConsumer } from './envio.consumer';
import { SmtpService } from './smtp.service';

/** Worker de envío: consume "correos.salida" y envía por SMTP. */
@Module({
  imports: [TypeOrmModule.forFeature([CorreoEnviado])],
  providers: [SmtpService, EnvioConsumer],
})
export class EnvioModule {}
