import type { QueueOptions } from '@golevelup/nestjs-rabbitmq';

/**
 * Nombres de exchanges, colas y routing keys usados en todo el sistema.
 * Tenerlos en un solo lugar evita errores de escritura entre la api y los workers.
 */

/** Exchange principal de tipo "direct". */
export const EXCHANGE_CORREOS = 'correos';

/** Exchange al que RabbitMQ manda los mensajes rechazados (dead letter exchange). */
export const EXCHANGE_FALLIDOS = 'correos.dlx';

export const COLA_SALIDA = 'correos.salida';
export const COLA_ENTRADA = 'correos.entrada';
export const COLA_FALLIDOS = 'correos.fallidos';

export const RK_SALIDA = 'salida';
export const RK_ENTRADA = 'entrada';
export const RK_FALLIDOS = 'fallidos';

/** Cabecera donde guardamos cuántas veces se intentó enviar un correo. */
export const HEADER_INTENTO = 'x-intento';

/** Reintentos permitidos después del primer intento fallido. */
export const MAX_REINTENTOS = 3;

/**
 * Opciones de la cola de salida. Si un mensaje se rechaza (nack sin reencolar),
 * RabbitMQ lo reenvía al exchange de fallidos, que lo deja en "correos.fallidos".
 * IMPORTANTE: estas opciones deben ser idénticas en todos los lugares donde se
 * declara la cola; si no, RabbitMQ responde PRECONDITION_FAILED.
 */
export const OPCIONES_COLA_SALIDA: QueueOptions = {
  durable: true,
  deadLetterExchange: EXCHANGE_FALLIDOS,
  deadLetterRoutingKey: RK_FALLIDOS,
};

export const OPCIONES_COLA_ENTRADA: QueueOptions = {
  durable: true,
};
