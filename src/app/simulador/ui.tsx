'use client';
import { useEffect, useState } from 'react';
import type { ResultadoTrabajador as R, EmpleadoInput, Periodo } from '@engine';
import { ResultadoTrabajador } from '@/components/ResultadoTrabajador';
import { num, rangoPeriodo } from '@/lib/format';

async function api(body: unknown) { const r = await fetch('/api/calcular', { method: 'POST', body: JSON.stringify(body) }); return r.json(); }
function periodoDe(tipo: 'quincenal' | 'mensual', fecha: string): Periodo {
  const d = new Date(fecha + 'T00:00:00Z'); const r = rangoPeriodo(tipo, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate() <= 15 ? 1 : 2); return { tipo, ...r };
}
const F = ({ l, children }: { l: string; children: React.ReactNode }) => <label className="block"><span className="lbl">{l}</span>{children}</label>;

export function Simuladores() {
  const [tab, setTab] = useState<'contratacion' | 'incremento'>('contratacion');
  return <div className="space-y-4">
    <div className="flex gap-2">{(['contratacion', 'incremento'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn' : 'btn-ghost'}>{t === 'contratacion' ? 'Simulador de contratación' : 'Simulador de incremento salarial'}</button>)}</div>
    {tab === 'contratacion' ? <Contratacion /> : <Incremento />}
  </div>;
}

function Contratacion() {
  const [f, setF] = useState({ neto: 30000, sd: 500, fecha: new Date().toISOString().slice(0, 10), tipo: 'mensual' as 'quincenal' | 'mensual', calc: 'mensual_fijo' as EmpleadoInput['tipo_calculo'], prest: 0 });
  const [r, setR] = useState<R | null>(null); const [err, setErr] = useState('');
  useEffect(() => { const t = setTimeout(async () => {
    const emp: EmpleadoInput = { sueldo_diario_fiscal: f.sd, neto_pactado: f.neto, tipo_calculo: f.calc, fecha_ingreso: f.fecha, prestaciones_adicionales_periodo: f.prest };
    const j = await api({ empleado: emp, periodo: periodoDe(f.tipo, f.fecha) }); if (j.ok) { setR(j.data); setErr(''); } else setErr(j.error);
  }, 250); return () => clearTimeout(t); }, [f]);
  const perAnio = f.tipo === 'quincenal' ? 24 : 12;
  return <div className="space-y-4">
    <div className="card p-4 grid md:grid-cols-6 gap-3">
      <F l="Sueldo neto deseado"><input className="inp num" type="number" value={f.neto} onChange={e => setF({ ...f, neto: +e.target.value })} /></F>
      <F l="Sueldo diario fiscal"><input className="inp num" type="number" step="0.01" value={f.sd} onChange={e => setF({ ...f, sd: +e.target.value })} /></F>
      <F l="Fecha de contratación"><input className="inp" type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} /></F>
      <F l="Esquema de pago"><select className="inp" value={f.tipo} onChange={e => { const tipo = e.target.value as 'quincenal' | 'mensual'; setF({ ...f, tipo, calc: tipo === 'quincenal' ? 'quincenal_fijo' : 'mensual_fijo' }); }}><option value="mensual">Mensual</option><option value="quincenal">Quincenal</option></select></F>
      <F l="Días pagados"><select className="inp" value={f.calc} onChange={e => setF({ ...f, calc: e.target.value as EmpleadoInput['tipo_calculo'] })}><option value="mensual_fijo">30 fijos</option><option value="quincenal_fijo">15 fijos</option><option value="diario_x_dias">Días reales</option></select></F>
      <F l="Prestaciones adicionales / periodo"><input className="inp num" type="number" value={f.prest} onChange={e => setF({ ...f, prest: +e.target.value })} /></F>
    </div>
    {err && <div className="card p-3 text-ember text-sm">{err}</div>}
    {r && <>
      <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Costo real del periodo', r.costo_real_total], ['Costo anual proyectado', r.costo_real_total * perAnio], ['Neto anual', r.neto_total * perAnio], ['Por cada $1 neto la empresa paga', r.relacion_costo_neto]].map(([k, v]) =>
          <div key={k as string}><div className="lbl">{k}</div><div className="num text-xl">{num(v as number)}</div></div>)}
      </div>
      <ResultadoTrabajador r={r} titulo="Desglose de la contratación" />
    </>}
  </div>;
}

function Incremento() {
  const [f, setF] = useState({ actual: 40000, nuevo: 45000, sd: 800, tipo: 'mensual' as 'quincenal' | 'mensual' });
  const [d, setD] = useState<Record<string, number> & { actual: R; nuevo: R } | null>(null); const [err, setErr] = useState('');
  useEffect(() => { const t = setTimeout(async () => {
    const fecha = new Date().toISOString().slice(0, 10);
    const emp: EmpleadoInput = { sueldo_diario_fiscal: f.sd, neto_pactado: f.actual, tipo_calculo: f.tipo === 'quincenal' ? 'quincenal_fijo' : 'mensual_fijo', fecha_ingreso: '2020-01-01' };
    const j = await api({ empleado: emp, periodo: periodoDe(f.tipo, fecha), netoNuevo: f.nuevo }); if (j.ok) { setD(j.data); setErr(''); } else setErr(j.error);
  }, 250); return () => clearTimeout(t); }, [f]);
  const rows = d ? [['Incremento neto trabajador', d.incremento_neto], ['Incremento nómina fiscal', d.incremento_fiscal], ['Incremento asimilables', d.incremento_asimilables], ['Incremento cargas patronales', d.incremento_cargas], ['Incremento costo por periodo', d.incremento_costo_periodo], ['Incremento costo anual', d.incremento_costo_anual]] : [];
  return <div className="space-y-4">
    <div className="card p-4 grid md:grid-cols-4 gap-3">
      <F l="Sueldo neto actual"><input className="inp num" type="number" value={f.actual} onChange={e => setF({ ...f, actual: +e.target.value })} /></F>
      <F l="Nuevo sueldo neto"><input className="inp num" type="number" value={f.nuevo} onChange={e => setF({ ...f, nuevo: +e.target.value })} /></F>
      <F l="Sueldo diario fiscal"><input className="inp num" type="number" step="0.01" value={f.sd} onChange={e => setF({ ...f, sd: +e.target.value })} /></F>
      <F l="Periodicidad"><select className="inp" value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value as 'quincenal' | 'mensual' })}><option value="mensual">Mensual</option><option value="quincenal">Quincenal</option></select></F>
    </div>
    {err && <div className="card p-3 text-ember text-sm">{err}</div>}
    {d && <div className="grid md:grid-cols-[360px_1fr] gap-4">
      <div className="card p-4"><table className="ledger w-full"><tbody>{rows.map(([k, v]) => <tr key={k as string}><td>{k}</td><td className="r">{num(v as number)}</td></tr>)}
        <tr className="font-semibold"><td>% real de incremento presupuestal</td><td className="r">{num(d.pct_incremento_presupuestal, 2)}%</td></tr></tbody></table>
        <p className="text-xs text-ink2 mt-3">El trabajador recibe {num(d.incremento_neto)} más; a la empresa le cuesta {num(d.incremento_costo_periodo)} por periodo.</p></div>
      <div className="space-y-4"><ResultadoTrabajador r={d.actual} titulo="Escenario actual" /><ResultadoTrabajador r={d.nuevo} titulo="Escenario propuesto" /></div>
    </div>}
  </div>;
}
