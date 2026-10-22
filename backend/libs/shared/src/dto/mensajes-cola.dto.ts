/**
 * Formatos de los mensajes que viajan por RabbitMQ (se serializan como JSON).
 */

/** Mensaje publicado en "correos.salida": un correo pendiente de enviar. */
export interface MensajeSalida {
  /** id del registro en la tabla correos_enviados. */
  correoId: number;
  para: string;
  asunto: string;
  mensaje: string;
}

/** Mensaje publicado en "correos.entrada": un correo leído por IMAP. */
export interface MensajeEntrada {
  messageId: string;
  remitente: string;
  destinatario: string | null;
  asunto: string;
  texto: string | null;
  html: string | null;
  /** Fecha en formato ISO 8601. */
  fecha: string;
}
