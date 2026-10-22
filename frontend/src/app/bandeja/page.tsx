'use client';

import { useState } from 'react';
import Aviso from '@/components/Aviso';
import Encabezado from '@/components/Encabezado';
import { usePolling } from '@/hooks/usePolling';
import { api, formatearFecha, type CorreoRecibido } from '@/lib/api';

/** Extrae solo el nombre del remitente ("Juan <juan@x.com>" → "Juan"). */
function nombreRemitente(remitente: string): string {
  const nombre = remitente.split('<')[0].trim().replace(/^"|"$/g, '');
  return nombre || remitente;
}

export default function BandejaPage() {
  const { datos: correos, error, cargando, actualizado } = usePolling(api.listarBandeja);
  const [seleccionado, setSeleccionado] = useState<CorreoRecibido | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  async function abrir(id: number) {
    setCargandoDetalle(true);
    setErrorDetalle(null);
    try {
      setSeleccionado(await api.obtenerRecibido(id));
    } catch (err) {
      setErrorDetalle(err instanceof Error ? err.message : 'No se pudo abrir el correo');
    } finally {
      setCargandoDetalle(false);
    }
  }

  return (
    <>
      <Encabezado
        titulo="Bandeja de entrada"
        descripcion="Correos leídos por IMAP, publicados en RabbitMQ y guardados por el worker."
        actualizado={actualizado}
      />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Lista de correos */}
        <section
          className={`min-h-0 overflow-y-auto border-slate-200 bg-white md:w-96 md:shrink-0 md:border-r ${
            seleccionado ? 'hidden md:block' : 'flex-1 md:flex-none'
          }`}
        >
          {error && (
            <div className="p-4">
              <Aviso tipo="error">{error}</Aviso>
            </div>
          )}
          {cargando && !correos && <p className="p-6 text-sm text-slate-500">Cargando correos…</p>}
          {correos && correos.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">
              <p className="mb-1 text-3xl">📭</p>
              No hay correos todavía. Envía uno a tu cuenta de Gmail y espera unos 30 segundos.
            </div>
          )}
          <ul>
            {correos?.map((correo) => {
              const activo = seleccionado?.id === correo.id;
              return (
                <li key={correo.id}>
                  <button
                    type="button"
                    onClick={() => abrir(correo.id)}
                    className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition-colors ${
                      activo ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {nombreRemitente(correo.remitente)}
                      </p>
                      <time className="shrink-0 text-xs text-slate-400">
                        {formatearFecha(correo.fecha)}
                      </time>
                    </div>
                    <p className="truncate text-sm text-slate-700">{correo.asunto}</p>
                    <p className="truncate text-xs text-slate-400">
                      {correo.texto?.slice(0, 120) || '(sin contenido de texto)'}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Detalle del correo */}
        <section
          className={`min-h-0 flex-1 overflow-y-auto ${seleccionado ? 'block' : 'hidden md:block'}`}
        >
          {errorDetalle && (
            <div className="p-4">
              <Aviso tipo="error">{errorDetalle}</Aviso>
            </div>
          )}
          {cargandoDetalle && <p className="p-6 text-sm text-slate-500">Abriendo correo…</p>}
          {!cargandoDetalle && !seleccionado && !errorDetalle && (
            <div className="flex h-full items-center justify-center p-8 text-sm text-slate-400">
              Selecciona un correo para leerlo
            </div>
          )}
          {!cargandoDetalle && seleccionado && (
            <article className="p-4 md:p-6">
              <button
                type="button"
                onClick={() => setSeleccionado(null)}
                className="mb-4 text-sm text-indigo-600 hover:underline md:hidden"
              >
                ← Volver a la bandeja
              </button>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">{seleccionado.asunto}</h2>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-slate-100 pb-4 text-sm">
                  <dt className="text-slate-400">De</dt>
                  <dd className="break-all text-slate-800">{seleccionado.remitente}</dd>
                  <dt className="text-slate-400">Para</dt>
                  <dd className="break-all text-slate-800">{seleccionado.destinatario ?? '—'}</dd>
                  <dt className="text-slate-400">Fecha</dt>
                  <dd className="text-slate-800">{formatearFecha(seleccionado.fecha)}</dd>
                </dl>

                {seleccionado.texto ? (
                  <pre className="mt-4 font-sans text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-800">
                    {seleccionado.texto}
                  </pre>
                ) : seleccionado.html ? (
                  // El HTML se muestra en un iframe aislado (sin scripts) por seguridad.
                  <iframe
                    title="Contenido del correo"
                    sandbox=""
                    srcDoc={seleccionado.html}
                    className="mt-4 h-[60vh] w-full rounded border border-slate-100"
                  />
                ) : (
                  <p className="mt-4 text-sm text-slate-400">(Correo sin contenido)</p>
                )}
              </div>
            </article>
          )}
        </section>
      </div>
    </>
  );
}
