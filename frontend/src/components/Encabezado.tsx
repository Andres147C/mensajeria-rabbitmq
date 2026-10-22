interface EncabezadoProps {
  titulo: string;
  descripcion?: string;
  actualizado?: Date | null;
}

/** Título de cada página con la hora de la última actualización automática. */
export default function Encabezado({ titulo, descripcion, actualizado }: EncabezadoProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 bg-white px-6 py-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{titulo}</h1>
        {descripcion && <p className="mt-0.5 text-sm text-slate-500">{descripcion}</p>}
      </div>
      {actualizado !== undefined && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          {actualizado
            ? `Actualizado ${actualizado.toLocaleTimeString('es-ES')} · cada 5 s`
            : 'Cargando…'}
        </p>
      )}
    </header>
  );
}
