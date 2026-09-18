import './globals.css';
import { currentUserEmail, supabaseServer } from '@/lib/supabase';
import { redirect } from 'next/navigation';

async function salir() { 'use server';
  const supabase = await supabaseServer(); await supabase.auth.signOut(); redirect('/login');
}
import Link from 'next/link';
import type { ReactNode } from 'react';
export const metadata = { title: 'Costo Real de Nómina · Blue Desert', description: 'Cálculo inverso de nómina y costo real por trabajador' };
const nav = [['/', 'Dashboard'], ['/nomina', 'Nómina'], ['/historial', 'Historial'], ['/reporte-mensual', 'Reporte mensual'], ['/sdi', 'SDI'], ['/empleados', 'Empleados'], ['/centros-costos', 'Centros de costos'], ['/asistencias', 'Asistencias'], ['/simulador', 'Simuladores'], ['/presupuesto', 'Presupuesto'], ['/configuracion-fiscal', 'Configuración fiscal']];
export default async function RootLayout({ children }: { children: ReactNode }) {
  const email = await currentUserEmail();
  return (
    <html lang="es"><body>
      <header className="border-b border-line bg-white">
        <div className="max-w-[1700px] mx-auto px-5 h-12 flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">Costo Real <span className="text-cobalt">de Nómina</span></Link>
          <nav className="flex gap-4 text-sm text-ink2">{nav.map(([h, l]) => <Link key={h} href={h} className="hover:text-cobalt">{l}</Link>)}</nav>
          <span className="ml-auto lbl hidden lg:inline">Seanjuan · Blue Desert Cabo</span>
          <span className="text-xs text-ink2 hidden md:inline">{email ?? ''}</span>
          {email && <form action={salir}><button className="btn-ghost text-xs">Salir</button></form>}
        </div>
      </header>
      <main className="max-w-[1700px] mx-auto px-5 py-6">{children}</main>
    </body></html>
  );
}
