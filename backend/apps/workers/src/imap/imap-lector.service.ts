import { createHash } from 'crypto';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { EXCHANGE_CORREOS, MensajeEntrada, RK_ENTRADA } from '@app/shared';

/**
 * Cada 30 segundos se conecta a Gmail por IMAP, busca los correos no leídos
 * de la bandeja INBOX que llegaron DESPUÉS de iniciar los workers, los publica
 * en RabbitMQ (routing key "entrada") y los marca como leídos.
 * Los correos no leídos que ya estaban en la bandeja no se tocan.
 */
@Injectable()
export class ImapLectorService implements OnApplicationBootstrap {
  private readonly logger = new Logger('LectorIMAP');
  /** Evita que dos revisiones se ejecuten al mismo tiempo. */
  private revisando = false;
  /** Momento en que arrancaron los workers: solo se procesan correos posteriores. */
  private readonly inicio = new Date();

  constructor(
    private readonly config: ConfigService,
    private readonly amqp: AmqpConnection,
  ) {}

  /** Hace una primera revisión al arrancar, sin esperar 30 s. */
  onApplicationBootstrap(): void {
    this.logger.log(
      `Solo se procesarán correos que lleguen desde ${this.inicio.toLocaleString('es-ES')}`,
    );
    setTimeout(() => void this.revisar(), 3000);
  }

  @Cron('*/30 * * * * *', { name: 'lector-imap' })
  async revisar(): Promise<void> {
    if (this.revisando) return;

    const usuario = this.config.get<string>('GMAIL_USER');
    const clave = this.config.get<string>('GMAIL_APP_PASSWORD')?.replace(/\s+/g, '');
    if (!usuario || !clave) {
      this.logger.warn('Faltan GMAIL_USER o GMAIL_APP_PASSWORD en .env: no se revisa la bandeja.');
      return;
    }

    this.revisando = true;
    const cliente = new ImapFlow({
      host: this.config.get<string>('IMAP_HOST', 'imap.gmail.com'),
      port: Number(this.config.get<string>('IMAP_PORT', '993')),
      secure: true,
      auth: { user: usuario, pass: clave },
      logger: false,
    });
    // Evita que un error de socket tumbe el proceso.
    cliente.on('error', (err: Error) => this.logger.error(`Error IMAP: ${err.message}`));

    try {
      await cliente.connect();
      const lock = await cliente.getMailboxLock('INBOX');
      try {
        // IMAP solo filtra por día (SINCE), así que pedimos desde el día anterior
        // al arranque y luego filtramos por hora exacta con la fecha de llegada.
        const desdeDia = new Date(this.inicio.getTime() - 24 * 60 * 60 * 1000);
        const candidatos =
          (await cliente.search({ seen: false, since: desdeDia }, { uid: true })) || [];

        const nuevos: number[] = [];
        if (candidatos.length > 0) {
          // Solo descarga la fecha de llegada (no el contenido) para filtrar.
          for await (const msg of cliente.fetch(
            candidatos,
            { uid: true, internalDate: true },
            { uid: true },
          )) {
            if (msg.internalDate && new Date(msg.internalDate) >= this.inicio) {
              nuevos.push(msg.uid);
            }
          }
        }

        if (nuevos.length === 0) {
          this.logger.log('[IMAP] Revisión completada: no hay correos nuevos');
          return;
        }

        // Limita cuántos se procesan por ciclo (los más recientes).
        const maximo = Number(this.config.get<string>('IMAP_MAX_POR_CICLO', '20'));
        const uids = nuevos.slice(-maximo);
        this.logger.log(`[IMAP] ${nuevos.length} correo(s) nuevo(s) sin leer; procesando ${uids.length}`);

        const publicados: number[] = [];
        for await (const msg of cliente.fetch(uids, { uid: true, source: true }, { uid: true })) {
          if (!msg.source) continue;
          const correo = await simpleParser(msg.source);

          const fecha = correo.date ?? new Date();
          const mensaje: MensajeEntrada = {
            // Si el correo no trae Message-ID generamos uno estable a partir de su contenido.
            messageId:
              correo.messageId ??
              `<sin-id-${createHash('sha1').update(msg.source).digest('hex')}@local>`,
            remitente: correo.from?.text ?? '(desconocido)',
            destinatario: textoDirecciones(correo.to),
            asunto: correo.subject ?? '(sin asunto)',
            texto: correo.text ?? null,
            html: typeof correo.html === 'string' ? correo.html : null,
            fecha: fecha.toISOString(),
          };

          await this.amqp.publish(EXCHANGE_CORREOS, RK_ENTRADA, mensaje, {
            persistent: true,
            contentType: 'application/json',
          });
          publicados.push(msg.uid);
          this.logger.log(
            `[PUBLICADO] Correo de ${mensaje.remitente} "${mensaje.asunto}" → routing key "${RK_ENTRADA}"`,
          );
        }

        // Solo marcamos como leídos los que se publicaron con éxito.
        if (publicados.length > 0) {
          await cliente.messageFlagsAdd(publicados, ['\\Seen'], { uid: true });
          this.logger.log(`[IMAP] ${publicados.length} correo(s) marcado(s) como leído(s) en Gmail`);
        }
      } finally {
        lock.release();
      }
    } catch (err) {
      this.logger.error(`[IMAP] No se pudo revisar la bandeja: ${(err as Error).message}`);
    } finally {
      this.revisando = false;
      await cliente.logout().catch(() => undefined);
    }
  }
}

/** Convierte el campo "to" de mailparser (uno o varios) en texto. */
function textoDirecciones(campo: { text: string } | { text: string }[] | undefined): string | null {
  if (!campo) return null;
  return Array.isArray(campo) ? campo.map((c) => c.text).join(', ') : campo.text;
}
