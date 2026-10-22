import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Mensajería con RabbitMQ',
  description: 'Cliente de correo que envía y recibe correos reales a través de RabbitMQ',
};

/** Layout general: barra lateral + contenido principal. */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-800 md:h-screen md:flex-row">
        <Suspense>
          <Sidebar />
        </Suspense>
        <main className="flex min-w-0 flex-1 flex-col md:overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
