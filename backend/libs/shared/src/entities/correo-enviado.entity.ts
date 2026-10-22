import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoCorreo } from '../enums/estado-correo.enum';

/**
 * Correo que el usuario redactó en la web y que se envía por SMTP.
 * La API lo crea con estado "en_cola" y el worker de envío lo actualiza.
 */
@Entity('correos_enviados')
export class CorreoEnviado {
  @PrimaryGeneratedColumn()
  id: number;

  /** Dirección de destino. */
  @Column({ type: 'varchar', length: 320 })
  para: string;

  @Column({ type: 'varchar', length: 200 })
  asunto: string;

  @Column({ type: 'text' })
  mensaje: string;

  /** Estado actual: en_cola, enviado o error. */
  @Column({ type: 'varchar', length: 20, default: EstadoCorreo.EN_COLA })
  estado: EstadoCorreo;

  /** Cuántas veces intentó enviarlo el worker. */
  @Column({ type: 'integer', default: 0 })
  intentos: number;

  /** Último mensaje de error (si hubo). */
  @Column({ type: 'text', nullable: true })
  error: string | null;

  /** Message-ID que devolvió el servidor SMTP al enviarlo. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  messageId: string | null;

  @Column({ type: 'datetime', nullable: true })
  enviadoEn: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizadoEn: Date;
}
