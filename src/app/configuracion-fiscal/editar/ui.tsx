'use client';
import { useState, useTransition } from 'react';
import type { FiscalParamSet, IsrBracket, CyvRow } from '@engine';
import { guardarVersionParams } from '@/lib/actions';

const N = ({ v, on, step = '0.01', w = 'w-28' }: { v: number; on: (n: number) => void; step?: string; w?: string }) => <input type="number" step={step} className={`inp num py-0.5 ${w}`} value={v} onChange={e => on(Number(e.target.value))} />;
const P = ({ v, on }: { v: number; on: (n: number) => void }) => <N v={Math.round(v * 100000) / 1000} on={n => on(n / 100)} step="0.001" w="w-24" />;
const F = ({ l, children }: { l: string; children: React.ReactNode }) => <label className="block"><span className="lbl">{l}</span>{children}</label>;

export function EditorParams({ base, baseId, baseLabel, esBorrador, siguienteVersion }: { base: FiscalParamSet; baseId: string; baseLabel: string; esBorrador: boolean; siguienteVersion: number }) {
  const [p, setP] = useState<FiscalParamSet>(JSON.parse(JSON.stringify(base)));
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [pending, start] = useTransition();
  const up = (fn: (d: FiscalParamSet) => void) => { const d = JSON.parse(JSON.stringify(p)); fn(d); setP(d); };
  const guardar = (modo: 'nueva' | 'sobrescribir') => start(async () => { setErr(''); setMsg(''); try { const r = await guardarVersionParams(JSON.stringify(p), modo, baseId); setMsg(r); } catch (e) { setErr((e as Error).message); } });
  const Tarifa = ({ k }: { k: 'quincenal' | 'mensual' }) => <div className="card p-3"><div className="flex items-center justify-between mb-1"><h3 className="font-semibold text-sm">Tarifa ISR {k}</h3><button className="text-xs text-cobalt" onClick={() => up(d => { d.isr[k].push({ li: 0, ls: null, cf: 0, pct: 0 }); })}>+ tramo</button></div>
    <table className="ledger w-full text-xs"><thead><tr><th className="r">Límite inf.</th><th className="r">Límite sup. (vacío = en adelante)</th><th className="r">Cuota fija</th><th className="r">% exc.</th><th></th></tr></thead><tbody>
      {p.isr[k].map((b: IsrBracket, i: number) => <tr key={i}><td className="r"><N v={b.li} on={n => up(d => { d.isr[k][i].li = n; })} /></td><td className="r"><input type="number" step="0.01" className="inp num py-0.5 w-28" value={b.ls ?? ''} onChange={e => up(d => { d.isr[k][i].ls = e.target.value === '' ? null : Number(e.target.value); })} /></td><td className="r"><N v={b.cf} on={n => up(d => { d.isr[k][i].cf = n; })} /></td><td className="r"><P v={b.pct} on={n => up(d => { d.isr[k][i].pct = n; })} /></td><td><button className="text-ember text-xs" onClick={() => up(d => { d.isr[k].splice(i, 1); })}>×</button></td></tr>)}
    </tbody></table></div>;
  const ramos: [keyof FiscalParamSet['imss'], string][] = [['enf_mat_cuota_fija_pct_uma', 'EyM cuota fija (% de UMA)'], ['enf_mat_excedente_3uma', 'EyM excedente 3 UMA'], ['prestaciones_dinero', 'Prestaciones en dinero'], ['gastos_medicos_pensionados', 'Gastos médicos pensionados'], ['invalidez_vida', 'Invalidez y vida'], ['guarderias', 'Guarderías y prest. sociales'], ['retiro_sar', 'Retiro (SAR)'], ['infonavit', 'INFONAVIT']];
  return <div className="space-y-4 max-w-6xl">
    <div className="flex items-baseline justify-between flex-wrap gap-2"><h1 className="text-xl font-semibold">Editar parámetros · base {baseLabel}</h1><a href="/configuracion-fiscal" className="text-sm text-cobalt">← Configuración fiscal</a></div>
    <div className="card p-4 grid md:grid-cols-6 gap-3">
      <F l="Ejercicio"><N v={p.ejercicio} on={n => up(d => { d.ejercicio = n; })} step="1" w="w-24" /></F>
      <F l="Vigencia desde"><input type="date" className="inp" value={p.vigencia_desde} onChange={e => up(d => { d.vigencia_desde = e.target.value; })} /></F>
      <F l="Vigencia hasta"><input type="date" className="inp" value={p.vigencia_hasta} onChange={e => up(d => { d.vigencia_hasta = e.target.value; })} /></F>
      <F l="UMA diaria"><N v={p.uma_diaria} on={n => up(d => { d.uma_diaria = n; d.uma_mensual = Math.round(n * 30.4 * 100) / 100; })} /></F>
      <F l="UMA mensual"><N v={p.uma_mensual} on={n => up(d => { d.uma_mensual = n; })} /></F>
      <F l="Tope cotización (UMA)"><N v={p.tope_cotizacion_umas} on={n => up(d => { d.tope_cotizacion_umas = n; })} step="1" w="w-20" /></F>
      <F l="Salario mínimo general"><N v={p.salario_minimo_general} on={n => up(d => { d.salario_minimo_general = n; })} /></F>
      <F l="Salario mínimo frontera"><N v={p.salario_minimo_frontera} on={n => up(d => { d.salario_minimo_frontera = n; })} /></F>
      <F l="Subsidio mensual"><N v={p.subsidio.monto_mensual} on={n => up(d => { d.subsidio.monto_mensual = n; })} /></F>
      <F l="Límite ingreso subsidio"><N v={p.subsidio.limite_ingreso_mensual} on={n => up(d => { d.subsidio.limite_ingreso_mensual = n; })} /></F>
      <F l="Subsidio quincenal (SAT)"><N v={p.subsidio.monto_quincenal ?? 0} on={n => up(d => { d.subsidio.monto_quincenal = n || undefined; })} /></F>
      <F l="Tarifa ISR asimilables"><select className="inp" value={p.asimilables_tarifa ?? 'mensual'} onChange={e => up(d => { d.asimilables_tarifa = e.target.value as 'mensual' | 'periodo'; })}><option value="mensual">Mensual (siempre)</option><option value="periodo">Según el periodo</option></select></F>
      <F l="Subsidio aplica"><select className="inp" value={p.subsidio.aplica ? '1' : '0'} onChange={e => up(d => { d.subsidio.aplica = e.target.value === '1'; })}><option value="1">Sí</option><option value="0">No</option></select></F>
      <F l="Prima de riesgo %"><P v={p.empresa.prima_riesgo_trabajo} on={n => up(d => { d.empresa.prima_riesgo_trabajo = n; })} /></F>
      <F l={`ISN ${p.isn.estado} %`}><P v={p.isn.pct} on={n => up(d => { d.isn.pct = n; })} /></F>
      <F l="ISN incluye asimilables"><select className="inp" value={p.isn.incluye_asimilables ? '1' : '0'} onChange={e => up(d => { d.isn.incluye_asimilables = e.target.value === '1'; })}><option value="0">No</option><option value="1">Sí</option></select></F>
      <F l="Comisión asimilables %"><P v={p.asimilables_comision?.pct ?? 0} on={n => up(d => { d.asimilables_comision = { pct: n, iva_pct: d.asimilables_comision?.iva_pct ?? 0.16 }; })} /></F>
      <F l="IVA comisión %"><P v={p.asimilables_comision?.iva_pct ?? 0} on={n => up(d => { d.asimilables_comision = { pct: d.asimilables_comision?.pct ?? 0, iva_pct: n }; })} /></F>
      <F l="Aguinaldo (días)"><N v={p.lft.dias_aguinaldo} on={n => up(d => { d.lft.dias_aguinaldo = n; })} step="1" w="w-20" /></F>
      <F l="Prima vacacional %"><P v={p.lft.prima_vacacional} on={n => up(d => { d.lft.prima_vacacional = n; })} /></F>
      <F l="Prima vac. exenta (UMA)"><N v={p.lft.prima_vacacional_exenta_umas ?? 15} on={n => up(d => { d.lft.prima_vacacional_exenta_umas = n; })} step="1" w="w-20" /></F>
      <F l="Prima dominical %"><P v={p.lft.prima_dominical ?? 0.25} on={n => up(d => { d.lft.prima_dominical = n; })} /></F>
      <F l="Prima dom. exenta (UMA/domingo)"><N v={p.lft.prima_dominical_exenta_umas ?? 1} on={n => up(d => { d.lft.prima_dominical_exenta_umas = n; })} step="1" w="w-20" /></F>
      <F l="Festivo trabajado extra %"><P v={p.lft.festivo_extra_pct ?? 2} on={n => up(d => { d.lft.festivo_extra_pct = n; })} /></F>
      <F l="Festivo exento %"><P v={p.lft.festivo_exento_pct ?? 0.5} on={n => up(d => { d.lft.festivo_exento_pct = n; })} /></F>
      <F l="Festivo exento tope (UMA/semana)"><N v={p.lft.festivo_exento_umas_semana ?? 5} on={n => up(d => { d.lft.festivo_exento_umas_semana = n; })} step="1" w="w-20" /></F>
      <F l="Exención IMSS obrero con SM"><select className="inp" value={p.imss.exencion_obrero_salario_minimo ? '1' : '0'} onChange={e => up(d => { d.imss.exencion_obrero_salario_minimo = e.target.value === '1'; })}><option value="1">Sí</option><option value="0">No</option></select></F>
      <F l="Tolerancia motor"><N v={p.motor.tolerancia} on={n => up(d => { d.motor.tolerancia = n; })} w="w-20" /></F>
    </div>
    <div className="grid md:grid-cols-2 gap-4"><Tarifa k="quincenal" /><Tarifa k="mensual" /></div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card p-3"><h3 className="font-semibold text-sm mb-1">Cuotas IMSS (%)</h3><table className="ledger w-full text-xs"><thead><tr><th>Ramo</th><th className="r">Patrón</th><th className="r">Obrero</th></tr></thead><tbody>
        {ramos.map(([k, l]) => { const r = p.imss[k] as { patron: number; obrero: number }; return <tr key={k}><td>{l}</td><td className="r"><P v={r.patron} on={n => up(d => { (d.imss[k] as { patron: number }).patron = n; })} /></td><td className="r"><P v={r.obrero} on={n => up(d => { (d.imss[k] as { obrero: number }).obrero = n; })} /></td></tr>; })}
        <tr><td>Cesantía y vejez obrero</td><td className="r">—</td><td className="r"><P v={p.imss.cesantia_vejez_obrero} on={n => up(d => { d.imss.cesantia_vejez_obrero = n; })} /></td></tr></tbody></table></div>
      <div className="card p-3"><div className="flex items-center justify-between mb-1"><h3 className="font-semibold text-sm">Cesantía y vejez patronal por rango de SBC</h3><button className="text-xs text-cobalt" onClick={() => up(d => { d.imss.cesantia_vejez_patron.push({ desde: 0, hasta: null, unidad: 'UMA', pct: 0 }); })}>+ rango</button></div>
        <table className="ledger w-full text-xs"><thead><tr><th className="r">Desde</th><th className="r">Hasta (vacío = en adelante)</th><th>Unidad</th><th className="r">% patrón</th><th></th></tr></thead><tbody>
          {p.imss.cesantia_vejez_patron.map((r: CyvRow, i: number) => <tr key={i}><td className="r"><N v={r.desde} on={n => up(d => { d.imss.cesantia_vejez_patron[i].desde = n; })} w="w-20" /></td><td className="r"><input type="number" step="0.01" className="inp num py-0.5 w-20" value={r.hasta ?? ''} onChange={e => up(d => { d.imss.cesantia_vejez_patron[i].hasta = e.target.value === '' ? null : Number(e.target.value); })} /></td><td><select className="inp py-0.5" value={r.unidad} onChange={e => up(d => { d.imss.cesantia_vejez_patron[i].unidad = e.target.value as 'SM' | 'UMA'; })}><option>SM</option><option>UMA</option></select></td><td className="r"><P v={r.pct} on={n => up(d => { d.imss.cesantia_vejez_patron[i].pct = n; })} /></td><td><button className="text-ember text-xs" onClick={() => up(d => { d.imss.cesantia_vejez_patron.splice(i, 1); })}>×</button></td></tr>)}
        </tbody></table></div>
    </div>
    <div className="card p-3"><h3 className="font-semibold text-sm mb-1">Vacaciones por año de antigüedad (días)</h3><div className="flex flex-wrap gap-1">{p.lft.vacaciones.map((v: number, i: number) => <label key={i} className="text-xs"><span className="lbl block">Año {i + 1}</span><N v={v} on={n => up(d => { d.lft.vacaciones[i] = n; })} step="1" w="w-14" /></label>)}</div></div>
    <div className="card p-4 flex flex-wrap items-center gap-3">
      <button className="btn" disabled={pending} onClick={() => guardar('nueva')}>Guardar como versión {siguienteVersion} (borrador)</button>
      {esBorrador && <button className="btn-ghost" disabled={pending} onClick={() => guardar('sobrescribir')}>Actualizar este borrador</button>}
      <span className="text-xs text-ink2">Después actívala en Configuración fiscal. Los cálculos ya guardados conservan la versión con la que se hicieron.</span>
      {msg && <span className="text-sm text-sage">{msg}</span>}{err && <span className="text-sm text-ember">{err}</span>}
    </div>
  </div>;
}
