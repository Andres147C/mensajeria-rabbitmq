interface AvisoProps {
  tipo: 'exito' | 'error' | 'info';
  children: React.ReactNode;
  onCerrar?: () => void;
}

const clases = {
  exito: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-slate-200 bg-slate-50 text-slate-700',
};

/** Mensaje de aviso (éxito, error o información). */
export default function Aviso({ tipo, children, onCerrar }: AvisoProps) {
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${clases[tipo]}`}
    >
      <div>{children}</div>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          className="shrink-0 opacity-60 hover:opacity-100"
          aria-label="Cerrar aviso"
        >
          ✕
        </button>
      )}
    </div>
  );
}
