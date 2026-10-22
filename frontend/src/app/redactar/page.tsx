'use client';

import { useState } from 'react';
import Link from 'next/link';
import Aviso from '@/components/Aviso';
import Encabezado from '@/components/Encabezado';
import { api, type NuevoCorreo } from '@/lib/api';

type Errores = Partial<Record<keyof NuevoCorreo, string>>;

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validación en el navegador (el backend vuelve a validar con class-validator). */
function validar(datos: NuevoCorreo): Errores {
  const errores: Errores = {};
  if (!datos.para.trim()) errores.para = 'Escribe la dirección del destinatario';
  else if (!REGEX_CORREO.test(datos.para.trim())) errores.para = 'La dirección no es válida';
  if (!datos.asunto.trim()) errores.asunto = 'El asunto es obligatorio';
  else if (datos.asunto.length > 200) errores.asunto = 'Máximo 200 caracteres';
  if (!datos.mensaje.trim()) errores.mensaje = 'El mensaje no puede estar vacío';
  return errores;
}

const vacio: NuevoCorreo = { para: '', asunto: '', mensaje: '' };

export default function RedactarPage() {
  const [datos, setDatos] = useState<NuevoCorreo>(vacio);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const cambiar = (campo: keyof NuevoCorreo) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setDatos((d) => ({ ...d, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }));
  };

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const encontrados = validar(datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    setAviso(null);
    try {
      const correo = await api.enviarCorreo(datos);
      setAviso({
        tipo: 'exito',
        texto: `Correo #${correo.id} puesto en la cola de RabbitMQ. El worker lo enviará en unos segundos.`,
      });
      setDatos(vacio);
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error al enviar' });
    } finally {
      setEnviando(false);
    }
  }

  const claseCampo = (campo: keyof NuevoCorreo) =>
    `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 ${
      errores[campo]
        ? 'border-red-400 focus:ring-red-200'
        : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
    }`;

  return (
    <>
      <Encabezado
        titulo="Redactar"
        descripcion="El correo se guarda, se publica en RabbitMQ y un worker lo envía por SMTP."
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <form
          onSubmit={enviar}
          noValidate
          className="mx-auto flex max-w-3xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          {aviso && (
            <Aviso tipo={aviso.tipo} onCerrar={() => setAviso(null)}>
              {aviso.texto}{' '}
              {aviso.tipo === 'exito' && (
                <Link href="/enviados" className="font-medium underline">
                  Ver en Enviados
                </Link>
              )}
            </Aviso>
          )}

          <div>
            <label htmlFor="para" className="mb-1 block text-sm font-medium text-slate-700">
              Para
            </label>
            <input
              id="para"
              type="email"
              placeholder="destinatario@ejemplo.com"
              value={datos.para}
              onChange={cambiar('para')}
              className={claseCampo('para')}
              aria-invalid={!!errores.para}
            />
            {errores.para && <p className="mt-1 text-xs text-red-600">{errores.para}</p>}
          </div>

          <div>
            <label htmlFor="asunto" className="mb-1 block text-sm font-medium text-slate-700">
              Asunto
            </label>
            <input
              id="asunto"
              type="text"
              placeholder="Asunto del correo"
              value={datos.asunto}
              onChange={cambiar('asunto')}
              maxLength={200}
              className={claseCampo('asunto')}
              aria-invalid={!!errores.asunto}
            />
            {errores.asunto && <p className="mt-1 text-xs text-red-600">{errores.asunto}</p>}
          </div>

          <div>
            <label htmlFor="mensaje" className="mb-1 block text-sm font-medium text-slate-700">
              Mensaje
            </label>
            <textarea
              id="mensaje"
              rows={10}
              placeholder="Escribe tu mensaje…"
              value={datos.mensaje}
              onChange={cambiar('mensaje')}
              className={`${claseCampo('mensaje')} resize-y`}
              aria-invalid={!!errores.mensaje}
            />
            {errores.mensaje && <p className="mt-1 text-xs text-red-600">{errores.mensaje}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDatos(vacio);
                setErrores({});
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Limpiar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
