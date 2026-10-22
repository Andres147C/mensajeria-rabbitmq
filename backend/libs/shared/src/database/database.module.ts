import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorreoEnviado } from '../entities/correo-enviado.entity';
import { CorreoRecibido } from '../entities/correo-recibido.entity';

/** Todas las entidades del sistema (se listan explícitamente para que funcione con webpack). */
export const ENTIDADES = [CorreoEnviado, CorreoRecibido];

/**
 * Conexión a SQLite con TypeORM. La api y los workers apuntan al mismo
 * archivo (DB_PATH), así ambos procesos ven los mismos datos.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const ruta = resolve(config.get<string>('DB_PATH', './data/correos.sqlite'));
        // better-sqlite3 no crea carpetas, así que nos aseguramos de que exista.
        mkdirSync(dirname(ruta), { recursive: true });
        return {
          type: 'better-sqlite3' as const,
          database: ruta,
          entities: ENTIDADES,
          // Crea/actualiza las tablas automáticamente (suficiente para un proyecto académico).
          synchronize: true,
          // WAL permite que un proceso lea mientras otro escribe.
          enableWAL: true,
          // Si el archivo está bloqueado por el otro proceso, espera hasta 10 s.
          timeout: 10000,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
