'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const enlaces = [
  { href: '/redactar', texto: 'Redactar', icono: '✏️' },
  { href: '/bandeja', texto: 'Bandeja de entrada', icono: '📥' },
  { href: '/enviados', texto: 'Enviados', icono: '📤' },
];

/** Barra lateral de navegación, estilo cliente de correo. */
export default function Sidebar() {
  const ruta = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white md:h-screen md:w-64 md:border-r md:border-b-0">
      <div className="flex items-center gap-2 px-5 py-4 md:py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-lg text-white">
          ✉
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Mensajería</p>
          <p className="text-xs text-slate-500">Gmail + RabbitMQ</p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
        {enlaces.map((enlace) => {
          const activo = ruta.startsWith(enlace.href);
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activo
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span aria-hidden>{enlace.icono}</span>
              {enlace.texto}
            </Link>
          );
        })}
      </nav>

      <p className="mt-auto hidden px-5 py-4 text-xs text-slate-400 md:block">
        Actividad universitaria · Colas de mensajes
      </p>
    </aside>
  );
}
