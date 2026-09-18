import { db } from '@/lib/db';
import { companyId } from '@/lib/actions';
import { num } from '@/lib/format';
import { revalidatePath } from 'next/cache';
import type { ResultadoTrabajador } from '@engine';
export const dynamic = 'force-dynamic';
async function eliminarPeriodo(id: string) { 'use server';
  await db.payrollCalculation.deleteMany({ where: { periodId: id } });
  await db.payrollPeriod.delete({ where: { id } });
  revalidatePath('/historial'); revalidatePath('/');
}
export default async function Historial() {
  const cid = await companyId();
  const periods = await db.payrollPeriod.findMany({ where: { companyId: cid }, orderBy: { fechaFin: 'desc' }, include: { paramSet: true } });
  const filas = await Promise.all(periods.map(async p => {
    const calcs = await db.payrollCalculation.findMany({ where: { periodId: p.id }, orderBy: { calculatedAt: 'desc' }, distinct: ['employeeId'] });
    const rs = calcs.map(c => c.result as unknown as ResultadoTrabajador);
    const s = (f: (r: ResultadoTrabajador) => number) => rs.reduce((a, r) => a + f(r), 0);
    return { p, n: rs.length, corridas: await db.payrollCalculation.count({ where: { periodId: p.id } }), ultimo: calcs[0]?.calculatedAt, bruto: s(r => r.nomina.bruto_fiscal), asim: s(r => r.asimilables.bruto), neto: s(r => r.neto_total), costo: s(r => r.costo_real_total) };
  }));
  return <div className="space-y-4">
    <div className="flex items-baseline justify-between"><h1 className="text-xl font-semibold">Historial de nóminas <a href="/historial/importar" className="text-sm text-cobalt font-normal ml-3">Importar histórica</a></h1><span className="lbl">Se muestra el último cálculo de cada trabajador por periodo. Eliminar borra el periodo con TODAS sus corridas (definitivo); úsalo para limpiar pruebas antes de la operación real.</span></div>
    <div className="card overflow-x-auto"><table className="ledger w-full"><thead><tr><th className="pl-3">Periodo</th><th>Tipo</th><th>Parámetros</th><th className="r">Trab.</th><th className="r">Bruto fiscal</th><th className="r">Asimilables</th><th className="r">Neto</th><th className="r">Costo real</th><th>Último cálculo</th><th className="r">Corridas</th><th></th></tr></thead><tbody>
      {filas.map(({ p, ...f }) => <tr key={p.id}><td className="pl-3 num">{p.fechaInicio.toISOString().slice(0, 10)} → {p.fechaFin.toISOString().slice(0, 10)}</td><td>{p.tipo}</td><td className="text-xs">{p.paramSet.ejercicio} v{p.paramSet.version}</td><td className="r">{f.n}</td><td className="r">{num(f.bruto)}</td><td className="r">{num(f.asim)}</td><td className="r">{num(f.neto)}</td><td className="r">{num(f.costo)}</td><td className="text-xs">{f.ultimo?.toLocaleString('es-MX')}</td><td className="r">{f.corridas}</td><td className="text-xs space-x-2 pr-2"><a href={`/historial/${p.id}`} className="text-cobalt">Ver reportes</a><form action={eliminarPeriodo.bind(null, p.id)} className="inline"><button className="text-ember" onClick={undefined}>Eliminar</button></form></td></tr>)}
      {!filas.length && <tr><td colSpan={11} className="p-6 text-center text-ink2">Aún no hay nóminas calculadas.</td></tr>}
    </tbody></table></div>
  </div>;
}
