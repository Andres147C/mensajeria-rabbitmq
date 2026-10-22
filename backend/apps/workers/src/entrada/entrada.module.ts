import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorreoRecibido } from '@app/shared';
import { EntradaConsumer } from './entrada.consumer';

/** Worker de entrada: consume "correos.entrada" y guarda en la base de datos. */
@Module({
  imports: [TypeOrmModule.forFeature([CorreoRecibido])],
  providers: [EntradaConsumer],
})
export class EntradaModule {}
