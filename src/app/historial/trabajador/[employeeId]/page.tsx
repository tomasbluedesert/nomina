import { db } from '@/lib/db';
import { num } from '@/lib/format';
import { ResultadoTrabajador } from '@/components/ResultadoTrabajador';
import type { ResultadoTrabajador as R } from '@engine';
export const dynamic = 'force-dynamic';
export default async function Trabajador({ params, searchParams }: { params: Promise<{ employeeId: string }>; searchParams: Promise<{ ver?: string }> }) {
  const { employeeId } = await params; const { ver } = await searchParams;
  const e = await db.employee.findUniqueOrThrow({ where: { id: employeeId } });
  const calcs = await db.payrollCalculation.findMany({ where: { employeeId }, orderBy: { calculatedAt: 'desc' }, include: { period: true, paramSet: true } });
  const sel = calcs.find(c => c.id === ver);
  const anio = new Date().getFullYear();
  const acum = calcs.filter(c => c.period.fechaFin.getFullYear() === anio).reduce((m, c) => { const k = c.periodId; if (!m.has(k)) m.set(k, c.result as unknown as R); return m; }, new Map<string, R>());
  const s = (f: (r: R) => number) => [...acum.values()].reduce((a, r) => a + f(r), 0);
  return <div className="space-y-4">
    <div className="flex items-baseline justify-between"><h1 className="text-xl font-semibold">{e.numeroEmpleado} · {e.nombre}</h1><span className="lbl">{e.puesto} · {e.esquema} · <a href="/empleados" className="text-cobalt">← Empleados</a></span></div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[['Periodos ' + anio, acum.size, 0], ['Bruto fiscal acumulado', s(r => r.nomina.bruto_fiscal)], ['Asimilables acumulado', s(r => r.asimilables.bruto)], ['Neto acumulado', s(r => r.neto_total)], ['Costo real acumulado', s(r => r.costo_real_total)]].map(([k, v, d]) => <div key={k as string} className="card p-3"><div className="lbl">{k}</div><div className="num text-lg">{num(v as number, d === 0 ? 0 : 2)}</div></div>)}</div>
    <div className="card overflow-x-auto"><table className="ledger w-full"><thead><tr><th className="pl-3">Periodo</th><th className="r">Días</th><th className="r">Bruto fiscal</th><th className="r">Asimilables</th><th className="r">Neto</th><th className="r">Costo real</th><th>Parámetros</th><th>Calculado</th><th></th></tr></thead><tbody>
      {calcs.map(c => { const r = c.result as unknown as R; return <tr key={c.id} className={c.id === ver ? 'bg-cobalt/5' : ''}><td className="pl-3 num">{c.period.fechaInicio.toISOString().slice(0, 10)} → {c.period.fechaFin.toISOString().slice(0, 10)}</td><td className="r">{r.nomina.dias_pagados}</td><td className="r">{num(r.nomina.bruto_fiscal)}</td><td className="r">{num(r.asimilables.bruto)}</td><td className="r">{num(r.neto_total)}</td><td className="r">{num(r.costo_real_total)}</td><td className="text-xs">{c.paramSet.ejercicio} v{c.paramSet.version}</td><td className="text-xs">{c.calculatedAt.toLocaleString('es-MX')}</td><td><a href={`?ver=${c.id}`} className="text-cobalt text-xs">Detalle</a></td></tr>; })}
      {!calcs.length && <tr><td colSpan={9} className="p-6 text-center text-ink2">Sin cálculos para este trabajador.</td></tr>}
    </tbody></table></div>
    {sel && <ResultadoTrabajador r={sel.result as unknown as R} titulo={`Cálculo del ${sel.calculatedAt.toLocaleString('es-MX')}`} />}
  </div>;
}
