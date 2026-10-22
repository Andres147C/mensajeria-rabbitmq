/**
 * Cliente de la API REST del backend (NestJS).
 * La URL base se configura en .env.local con NEXT_PUBLIC_API_URL.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(
  /\/$/,
  '',
);

export type EstadoCorreo = 'en_cola' | 'enviado' | 'error';

/** Correo enviado desde la aplicación (GET /enviados). */
export interface CorreoEnviado {
  id: number;
  para: string;
  asunto: string;
  mensaje: string;
  estado: EstadoCorreo;
  intentos: number;
  error: string | null;
  messageId: string | null;
  enviadoEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

/** Correo recibido en Gmail (GET /bandeja y /bandeja/:id). */
export interface CorreoRecibido {
  id: number;
  messageId: string;
  remitente: string;
  destinatario: string | null;
  asunto: string;
  texto: string | null;
  html?: string | null;
  fecha: string;
  recibidoEn: string;
}

export interface NuevoCorreo {
  para: string;
  asunto: string;
  mensaje: string;
}

/** Error con el mensaje legible que devuelve NestJS. */
export class ErrorApi extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      cache: 'no-store',
    });
  } catch {
    throw new ErrorApi(`No se pudo conectar con la API (${API_URL}). ¿Está levantada?`, 0);
  }

  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    // NestJS devuelve { message: string | string[] }
    const mensaje = Array.isArray(cuerpo?.message)
      ? cuerpo.message.join('. ')
      : (cuerpo?.message ?? `Error ${respuesta.status}`);
    throw new ErrorApi(mensaje, respuesta.status);
  }
  return cuerpo as T;
}

export const api = {
  enviarCorreo: (datos: NuevoCorreo) =>
    pedir<CorreoEnviado>('/correos', { method: 'POST', body: JSON.stringify(datos) }),
  listarEnviados: () => pedir<CorreoEnviado[]>('/enviados'),
  listarBandeja: () => pedir<CorreoRecibido[]>('/bandeja'),
  obtenerRecibido: (id: number) => pedir<CorreoRecibido>(`/bandeja/${id}`),
};

/** Formatea una fecha ISO en formato local corto (es-ES). */
export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  return fecha.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
