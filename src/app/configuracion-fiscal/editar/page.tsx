import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { EditorParams } from './ui';
import type { FiscalParamSet } from '@engine';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const sets = await db.fiscalParamSet.findMany({ orderBy: [{ ejercicio: 'desc' }, { version: 'desc' }] });
  const sel = sets.find(s => s.id === ver) ?? sets.find(s => s.estado === 'vigente') ?? sets[0];
  if (!sel) return <div className="card p-4">No hay parámetros que editar; carga primero un JSON o ejecuta el seed.</div>;
  const sig = Math.max(...sets.filter(s => s.ejercicio === sel.ejercicio).map(s => s.version)) + 1;
  return <EditorParams base={sel.data as unknown as FiscalParamSet} baseId={sel.id} baseLabel={`${sel.ejercicio} v${sel.version} (${sel.estado})`} esBorrador={sel.estado === 'borrador'} siguienteVersion={sig} />;
}
