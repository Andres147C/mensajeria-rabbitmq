import type { EstadoCorreo } from '@/lib/api';

const estilos: Record<EstadoCorreo, { texto: string; clases: string }> = {
  en_cola: { texto: 'En cola', clases: 'bg-amber-100 text-amber-800 ring-amber-200' },
  enviado: { texto: 'Enviado', clases: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  error: { texto: 'Error', clases: 'bg-red-100 text-red-800 ring-red-200' },
};

/** Etiqueta de color según el estado del correo enviado. */
export default function EstadoBadge({ estado }: { estado: EstadoCorreo }) {
  const estilo = estilos[estado] ?? estilos.en_cola;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${estilo.clases}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${estado === 'en_cola' ? 'animate-pulse' : ''}`}
      />
      {estilo.texto}
    </span>
  );
}
