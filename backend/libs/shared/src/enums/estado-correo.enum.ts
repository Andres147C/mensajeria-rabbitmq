/**
 * Estados posibles de un correo enviado desde la aplicación.
 * - EN_COLA: la API lo guardó y lo publicó en RabbitMQ, pero aún no se envía.
 * - ENVIADO: el worker lo entregó correctamente al servidor SMTP de Gmail.
 * - ERROR:   falló después de todos los reintentos y terminó en la dead letter queue.
 */
export enum EstadoCorreo {
  EN_COLA = 'en_cola',
  ENVIADO = 'enviado',
  ERROR = 'error',
}
