'use client';
import { useState, useTransition } from 'react';
import { calcularPeriodo, prepararPeriodo, guardarBorradorDias, listarPagosExtra, agregarPagoExtra, eliminarPagoExtra, leerLayoutOficial } from '@/lib/actions';
import { ReportesNomina } from '@/components/ReportesNomina';
import { num } from '@/lib/format';
type Res = Awaited<ReturnType<typeof calcularPeriodo>>; type Prep = Awaited<ReturnType<typeof prepararPeriodo>>;
export function NominaCliente() {
  const hoy = new Date();
  const [tipo, setTipo] = useState<'quincenal' | 'mensual'>('quincenal');
  const [anio, setAnio] = useState(hoy.getFullYear()); const [mes, setMes] = useState(hoy.getMonth() + 1); const [q, setQ] = useState<1 | 2>(1);
  const [prep, setPrep] = useState<Prep | null>(null); const [dias, setDias] = useState<Record<string, number>>({}); const [vac, setVac] = useState<Record<string, number>>({}); const [dom, setDom] = useState<Record<string, number>>({}); const [fest, setFest] = useState<Record<string, number>>({});
  type PE = Awaited<ReturnType<typeof listarPagosExtra>>; const [extras, setExtras] = useState<PE>([]); const [nuevo, setNuevo] = useState({ employeeId: '', concepto: '', importe: '', destino: 'fiscal' as 'fiscal' | 'asimilables' });
  const [res, setRes] = useState<Res | null>(null); const [err, setErr] = useState(''); const [pending, start] = useTransition();
  const [layout, setLayout] = useState<File | null>(null); const [ajuste, setAjuste] = useState<{ encontrados: number; sinMatch: string[] } | null>(null);
  const ok = res?.resultados.filter(r => r.resultado) ?? [];
  const tot = (f: (r: NonNullable<Res['resultados'][number]['resultado']>) => number) => ok.reduce((a, r) => a + f(r.resultado!), 0);
  const preparar = () => start(async () => { setErr(''); setRes(null); try { const p = await prepararPeriodo(tipo, anio, mes, q); setPrep(p); setDias(Object.fromEntries(p.filas.map(f => [f.employeeId, f.diasBorrador ?? f.dias]))); setVac(Object.fromEntries(p.filas.map(f => [f.employeeId, f.vacBorrador ?? f.vacaciones]))); setDom(Object.fromEntries(p.filas.map(f => [f.employeeId, f.domBorrador ?? f.domingos]))); setFest(Object.fromEntries(p.filas.map(f => [f.employeeId, f.festBorrador ?? f.festivos]))); setExtras(await listarPagosExtra(p.periodo.fecha_inicio, p.periodo.fecha_fin)); } catch (e) { setErr((e as Error).message); } });
  const ajustarConLayout = () => start(async () => { if (!layout) return; setErr('');
    try { const fd = new FormData(); fd.set('archivo', layout);
      const { overrides, encontrados, sinMatch } = await leerLayoutOficial(fd); setAjuste({ encontrados, sinMatch });
      const map = Object.fromEntries(prep!.filas.map(f => { const d = dias[f.employeeId] ?? f.dias, v = vac[f.employeeId] ?? f.vacaciones, o = dom[f.employeeId] ?? f.domingos, x = fest[f.employeeId] ?? f.festivos; return [f.employeeId, { dias: d, vacaciones: v, domingos: o, festivos: x, detalle: f.detalle, fuente: 'layout' }]; }));
      setRes(await calcularPeriodo(tipo, anio, mes, q, map, overrides));
    } catch (e) { setErr((e as Error).message); } });
  const calcular = () => start(async () => { setErr(''); try {
    const map = Object.fromEntries(prep!.filas.map(f => { const d = dias[f.employeeId] ?? f.dias, v = vac[f.employeeId] ?? f.vacaciones, o = dom[f.employeeId] ?? f.domingos, x = fest[f.employeeId] ?? f.festivos; return [f.employeeId, { dias: d, vacaciones: v, domingos: o, festivos: x, detalle: f.detalle, fuente: d !== f.dias || v !== f.vacaciones || o !== f.domingos || x !== f.festivos ? 'manual' : f.fuente }]; }));
    setRes(await calcularPeriodo(tipo, anio, mes, q, map)); } catch (e) { setErr((e as Error).message); } });
  const persistir = (nd: Record<string, number>, nv: Record<string, number>, no: Record<string, number>, nx: Record<string, number>) => { if (!prep) return; const edit: Record<string, number> = {}; const f = (k: string) => prep.filas.find(y => y.employeeId === k);
    for (const [k, x] of Object.entries(nd)) if (x !== f(k)?.dias) edit[k] = x; for (const [k, x] of Object.entries(nv)) if (x !== f(k)?.vacaciones) edit['vac:' + k] = x; for (const [k, x] of Object.entries(no)) if (x !== f(k)?.domingos) edit['dom:' + k] = x; for (const [k, x] of Object.entries(nx)) if (x !== f(k)?.festivos) edit['fest:' + k] = x;
    guardarBorradorDias(prep.periodo.fecha_inicio, prep.periodo.fecha_fin, edit).catch(() => {}); };
  const setDia = (id: string, v: number) => { const nd = { ...dias, [id]: v }; setDias(nd); persistir(nd, vac, dom, fest); };
  const setV = (id: string, v: number) => { const nv = { ...vac, [id]: v }; setVac(nv); persistir(dias, nv, dom, fest); };
  const setO = (id: string, v: number) => { const no = { ...dom, [id]: v }; setDom(no); persistir(dias, vac, no, fest); };
  const setX = (id: string, v: number) => { const nx = { ...fest, [id]: v }; setFest(nx); persistir(dias, vac, dom, nx); };
  const Num = ({ v, on }: { v: number; on: (n: number) => void }) => <input type="number" min={0} max={31} step={1} className="inp num w-14 text-right py-0.5" value={v} onChange={e => on(Math.max(0, Number(e.target.value)))} />;
  const detalleTxt = (d: Record<string, number>) => Object.entries(d).filter(([k]) => k !== 'A').map(([k, v]) => `${k}:${v}`).join(' ');
  return (
    <div className="space-y-5">
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <label><span className="lbl">Periodicidad</span><select className="inp" value={tipo} onChange={e => setTipo(e.target.value as 'quincenal' | 'mensual')}><option value="quincenal">Quincenal</option><option value="mensual">Mensual</option></select></label>
        <label><span className="lbl">Año</span><input className="inp num w-24" type="number" value={anio} onChange={e => setAnio(+e.target.value)} /></label>
        <label><span className="lbl">Mes</span><input className="inp num w-20" type="number" min={1} max={12} value={mes} onChange={e => setMes(+e.target.value)} /></label>
        {tipo === 'quincenal' && <label><span className="lbl">Quincena</span><select className="inp" value={q} onChange={e => setQ(+e.target.value as 1 | 2)}><option value={1}>1ª (1–15)</option><option value={2}>2ª (16–fin)</option></select></label>}
        <button className="btn" disabled={pending} onClick={preparar}>{pending && !prep ? 'Leyendo…' : '1. Preparar días'}</button>
        <span className="text-xs text-ink2">Primero se proponen los días pagados (desde asistencias si está conectada); revísalos, ajusta y calcula.</span>
      </div>
      {err && <div className="card p-3 text-ember text-sm">{err}</div>}
      {prep && !res && <div className="card p-4">
        <div className="flex items-center gap-3 mb-2 flex-wrap"><h3 className="font-semibold">Días pagados · {prep.periodo.fecha_inicio} → {prep.periodo.fecha_fin}</h3>
          {prep.borrador && <span className="text-xs px-1.5 py-0.5 rounded bg-amber/15 text-amber">Borrador con ediciones recuperado</span>}
          <span className={`text-xs px-1.5 py-0.5 rounded ${prep.asistencias ? (prep.cerrado ? 'bg-sage/15 text-sage' : 'bg-amber/15 text-amber') : 'bg-line'}`}>{prep.asistencias ? (prep.cerrado ? 'Asistencias: periodo cerrado' : 'Asistencias: periodo abierto, puede cambiar') : 'Sin conexión a asistencias: días calendario'}</span>
          <button className="btn ml-auto" disabled={pending} onClick={calcular}>{pending ? 'Calculando…' : '2. Calcular nómina'}</button></div>
        <table className="ledger w-full text-sm"><thead><tr><th>No.</th><th>Nombre</th><th>Esquema</th><th>Fuente</th><th className="r">Base</th><th className="r">Días pagados</th><th className="r">Vac.</th><th className="r">Dom. trab.</th><th className="r">Fest. trab.</th><th>Incidencias</th><th>Notas</th></tr></thead><tbody>
          {prep.filas.map(f => { const v = dias[f.employeeId] ?? f.dias; const ed = v !== f.dias; return <tr key={f.employeeId} className={ed ? 'bg-amber/5' : ''}>
            <td className="num">{f.numero}</td><td>{f.nombre}</td><td className="text-xs">{f.esquema}</td><td className="text-xs">{ed ? 'manual' : f.fuente}</td><td className="r">{f.diasPeriodo}</td>
            <td className="r"><input type="number" min={0} max={31} step={1} className="inp num w-20 text-right py-0.5" value={v} onChange={e => setDia(f.employeeId, Math.max(0, Number(e.target.value)))} /></td>
            <td className="r">{f.esquema === 'asimilables' ? <span className="text-ink2/50">—</span> : <Num v={vac[f.employeeId] ?? f.vacaciones} on={n => setV(f.employeeId, n)} />}</td>
            <td className="r"><Num v={dom[f.employeeId] ?? f.domingos} on={n => setO(f.employeeId, n)} /></td>
            <td className="r"><Num v={fest[f.employeeId] ?? f.festivos} on={n => setX(f.employeeId, n)} /></td>
            <td className="text-xs font-mono">{detalleTxt(f.detalle)}</td><td className="text-xs text-ink2">{f.notas.join(' · ')}</td></tr>; })}
          {!prep.filas.length && <tr><td colSpan={11} className="p-4 text-center text-ink2">No hay trabajadores activos con periodicidad {tipo}.</td></tr>}
        </tbody></table>
        <div className="mt-4 border-t border-line pt-3">
          <h4 className="font-semibold text-sm mb-1">Pagos extraordinarios del periodo <span className="lbl ml-2">bonos, comisiones, gratificaciones</span></h4>
          <div className="flex flex-wrap items-end gap-2 mb-2">
            <label><span className="lbl">Trabajador</span><select className="inp" value={nuevo.employeeId} onChange={e => setNuevo({ ...nuevo, employeeId: e.target.value })}><option value="">—</option>{prep.filas.map(f => <option key={f.employeeId} value={f.employeeId}>{f.numero} {f.nombre}</option>)}</select></label>
            <label><span className="lbl">Concepto</span><input className="inp" value={nuevo.concepto} onChange={e => setNuevo({ ...nuevo, concepto: e.target.value })} placeholder="Bono de productividad" /></label>
            <label><span className="lbl">Importe</span><input type="number" step="0.01" min="0" className="inp num w-28" value={nuevo.importe} onChange={e => setNuevo({ ...nuevo, importe: e.target.value })} /></label>
            <label><span className="lbl">Destino</span><select className="inp" value={nuevo.destino} onChange={e => setNuevo({ ...nuevo, destino: e.target.value as 'fiscal' | 'asimilables' })}><option value="fiscal">Nómina fiscal (bruto gravable)</option><option value="asimilables">Asimilables (neto a recibir)</option></select></label>
            <button className="btn-ghost" disabled={pending || !nuevo.employeeId || !nuevo.concepto || !(Number(nuevo.importe) > 0)} onClick={() => start(async () => { setErr(''); try { setExtras(await agregarPagoExtra(prep.periodo.fecha_inicio, prep.periodo.fecha_fin, nuevo.employeeId, nuevo.concepto, Number(nuevo.importe), nuevo.destino)); setNuevo({ ...nuevo, concepto: '', importe: '' }); } catch (e) { setErr((e as Error).message); } })}>+ Agregar</button>
          </div>
          {extras.length > 0 ? <table className="ledger w-full text-sm"><thead><tr><th>No.</th><th>Nombre</th><th>Concepto</th><th>Destino</th><th className="r">Importe</th><th></th></tr></thead><tbody>
            {extras.map(x => <tr key={x.id}><td className="num">{x.numero}</td><td>{x.nombre}</td><td>{x.concepto}</td><td className="text-xs">{x.destino === 'fiscal' ? 'Fiscal (bruto)' : 'Asimilables (neto)'}</td><td className="r">{num(x.importe)}</td><td><button className="text-ember text-xs" onClick={() => start(async () => setExtras(await eliminarPagoExtra(x.id, prep.periodo.fecha_inicio, prep.periodo.fecha_fin)))}>quitar</button></td></tr>)}
          </tbody></table> : <p className="text-xs text-ink2">Sin pagos extraordinarios en este periodo.</p>}
        </div>
        <p className="text-xs text-ink2 mt-2">Fijo = días de nómina fija (15/30) menos días no pagados. Calendario = días reales del periodo. Vac. = días V (dentro de los pagados) con prima vacacional; Dom. trab. = domingos con marca de trabajo (prima dominical); Fest. trab. = festivos trabajados (pago extra). Las primas se calculan sobre el sueldo diario pactado y se suman al neto. Las celdas en ámbar fueron editadas a mano: se guardan como borrador del periodo (no se pierden al salir) y quedan en la auditoría al calcular.</p>
      </div>}
      {res && <>
        <div className="card p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          {[['Trabajadores', ok.length, 0], ['Bruto fiscal', tot(r => r.nomina.bruto_fiscal)], ['Asimilables', tot(r => r.asimilables.bruto)], ['ISR retenido', tot(r => r.nomina.isr_nomina + r.asimilables.isr)], ['Neto pagado', tot(r => r.neto_total)], ['Costo real', tot(r => r.costo_real_total)]].map(([k, v, d]) =>
            <div key={k as string}><div className="lbl">{k}</div><div className="num text-lg">{num(v as number, d === 0 ? 0 : 2)}</div></div>)}
          <div className="md:col-span-6 flex flex-wrap items-center gap-3"><span className="lbl">{res.periodo.fecha_inicio} → {res.periodo.fecha_fin} · parámetros {res.paramSet}</span>
            <span className="ml-auto flex items-center gap-2 text-xs"><input type="file" accept=".xlsx,.xls" className="inp py-0.5 text-xs w-56" onChange={e => setLayout(e.target.files?.[0] ?? null)} />
            <button className="btn-ghost" disabled={pending || !layout || !prep} onClick={ajustarConLayout}>{pending ? 'Ajustando…' : 'Ajustar con layout ISR/IMSS'}</button></span>
            <button className="btn-ghost text-xs" onClick={() => setRes(null)}>← Volver a días</button></div>
          {ajuste && <div className="md:col-span-6 text-xs text-ink2">Layout aplicado a {ajuste.encontrados} trabajador(es); recalculado y guardado como nueva corrida.{ajuste.sinMatch.length > 0 && <span className="text-ember"> Sin coincidencia: {ajuste.sinMatch.join(', ')}</span>} Las diferencias contra lo calculado aparecen como avisos AJUSTE_*_LAYOUT en cada trabajador.</div>}
        </div>
        <ReportesNomina filas={res.resultados} periodo={`${res.periodo.fecha_inicio}_${res.periodo.fecha_fin}`} />
      </>}
    </div>
  );
}
