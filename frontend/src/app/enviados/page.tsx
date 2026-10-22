'use client';

import Aviso from '@/components/Aviso';
import Encabezado from '@/components/Encabezado';
import EstadoBadge from '@/components/EstadoBadge';
import { usePolling } from '@/hooks/usePolling';
import { api, formatearFecha } from '@/lib/api';

export default function EnviadosPage() {
  const { datos: correos, error, cargando, actualizado } = usePolling(api.listarEnviados);

  // Pequeño resumen por estado para la presentación.
  const resumen = {
    en_cola: correos?.filter((c) => c.estado === 'en_cola').length ?? 0,
    enviado: correos?.filter((c) => c.estado === 'enviado').length ?? 0,
    error: correos?.filter((c) => c.estado === 'error').length ?? 0,
  };

  return (
    <>
      <Encabezado
        titulo="Enviados"
        descripcion="Estado de cada correo mientras pasa por la cola correos.salida."
        actualizado={actualizado}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {error && (
          <div className="mb-4">
            <Aviso tipo="error">{error}</Aviso>
          </div>
        )}

        {correos && correos.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              En cola: <b>{resumen.en_cola}</b>
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              Enviados: <b>{resumen.enviado}</b>
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              Con error: <b>{resumen.error}</b>
            </span>
          </div>
        )}

        {cargando && !correos && <p className="text-sm text-slate-500">Cargando…</p>}

        {correos && correos.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Todavía no has enviado correos. Ve a <b>Redactar</b> para enviar el primero.
          </div>
        )}

        {correos && correos.length > 0 && (
          <ul className="flex flex-col gap-2">
            {correos.map((correo) => (
              <li
                key={correo.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      <span className="font-normal text-slate-400">Para:</span> {correo.para}
                    </p>
                    <p className="truncate text-sm text-slate-700">{correo.asunto}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <time className="text-xs text-slate-400">{formatearFecha(correo.creadoEn)}</time>
                    <EstadoBadge estado={correo.estado} />
                  </div>
                </div>

                <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-400">
                  <span>#{correo.id}</span>
                  <span>Intentos: {correo.intentos}</span>
                  {correo.enviadoEn && <span>Enviado: {formatearFecha(correo.enviadoEn)}</span>}
                </div>

                {correo.error && correo.estado !== 'enviado' && (
                  <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs break-words text-red-700">
                    {correo.estado === 'error' ? 'Error: ' : 'Último fallo (reintentando): '}
                    {correo.error}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
