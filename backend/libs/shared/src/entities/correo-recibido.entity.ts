import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Correo que llegó a la cuenta de Gmail y que el lector IMAP
 * publicó en RabbitMQ. El consumidor de entrada lo guarda aquí.
 */
@Entity('correos_recibidos')
export class CorreoRecibido {
  @PrimaryGeneratedColumn()
  id: number;

  /** Message-ID del correo: se usa para evitar duplicados. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 500 })
  messageId: string;

  /** Remitente tal como viene en la cabecera From (nombre y dirección). */
  @Column({ type: 'varchar', length: 500 })
  remitente: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  destinatario: string | null;

  @Column({ type: 'varchar', length: 500 })
  asunto: string;

  /** Cuerpo en texto plano. */
  @Column({ type: 'text', nullable: true })
  texto: string | null;

  /** Cuerpo en HTML (si el correo lo trae). */
  @Column({ type: 'text', nullable: true })
  html: string | null;

  /** Fecha en que se envió el correo original. */
  @Column({ type: 'datetime' })
  fecha: Date;

  /** Fecha en que nuestra aplicación lo guardó. */
  @CreateDateColumn({ type: 'datetime' })
  recibidoEn: Date;
}
