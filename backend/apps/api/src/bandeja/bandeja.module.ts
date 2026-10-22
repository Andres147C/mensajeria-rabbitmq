import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorreoRecibido } from '@app/shared';
import { BandejaController } from './bandeja.controller';
import { BandejaService } from './bandeja.service';

/** Bandeja de entrada: consulta los correos que guardó el worker de entrada. */
@Module({
  imports: [TypeOrmModule.forFeature([CorreoRecibido])],
  controllers: [BandejaController],
  providers: [BandejaService],
})
export class BandejaModule {}
