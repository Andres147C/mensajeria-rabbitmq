import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

/** Datos mínimos para enviar un correo. */
export interface DatosEnvio {
  para: string;
  asunto: string;
  mensaje: string;
}

/**
 * Envía correos reales usando el servidor SMTP de Gmail (nodemailer).
 * Requiere GMAIL_USER y GMAIL_APP_PASSWORD (contraseña de aplicación).
 */
@Injectable()
export class SmtpService implements OnModuleInit {
  private readonly logger = new Logger('SMTP');
  private readonly transporter: Transporter;
  private readonly remitente: string;

  constructor(private readonly config: ConfigService) {
    const usuario = this.config.get<string>('GMAIL_USER', '');
    const puerto = Number(this.config.get<string>('SMTP_PORT', '465'));
    const nombre = this.config.get<string>('REMITENTE_NOMBRE', 'Mensajería RabbitMQ');

    this.remitente = `"${nombre}" <${usuario}>`;
    this.transporter = createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: puerto,
      // 465 usa TLS directo; 587 usa STARTTLS.
      secure: puerto === 465,
      auth: {
        user: usuario,
        // Gmail muestra la contraseña de aplicación con espacios: los quitamos.
        pass: this.config.get<string>('GMAIL_APP_PASSWORD', '').replace(/\s+/g, ''),
      },
    });
  }

  /** Al iniciar, comprueba que las credenciales SMTP funcionan (solo informa, no detiene el proceso). */
  async onModuleInit(): Promise<void> {
    if (!this.config.get<string>('GMAIL_USER') || !this.config.get<string>('GMAIL_APP_PASSWORD')) {
      this.logger.warn('Faltan GMAIL_USER o GMAIL_APP_PASSWORD en .env: los envíos fallarán.');
      return;
    }
    try {
      await this.transporter.verify();
      this.logger.log('Conexión SMTP con Gmail verificada correctamente');
    } catch (err) {
      this.logger.error(`No se pudo verificar SMTP: ${(err as Error).message}`);
    }
  }

  /** Envía el correo y devuelve el Message-ID asignado. */
  async enviar(datos: DatosEnvio): Promise<string> {
    const info = await this.transporter.sendMail({
      from: this.remitente,
      to: datos.para,
      subject: datos.asunto,
      text: datos.mensaje,
    });
    return info.messageId;
  }
}
