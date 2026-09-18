import { db } from '@/lib/db';
import { guardarParamSet, activarParamSet, agregarComisionAsimilables } from '@/lib/actions';
import type { FiscalParamSet } from '@engine';
import { num } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Config({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const sets = await db.fiscalParamSet.findMany({ orderBy: [{ ejercicio: 'desc' }, { version: 'desc' }] });
  const sel = sets.find(s => s.id === ver) ?? sets.find(s => s.estado === 'vigente') ?? sets[0];
  const p = sel?.data as unknown as FiscalParamSet | undefined;
  const hoy = new Date(); const aviso = sets.some(s => s.estado === 'vigente' && (s.vigenciaHasta.getTime() - hoy.getTime()) / 864e5 < 30);
  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-6">
      <div className="space-y-3">
        <div className="card"><table className="ledger w-full"><thead><tr><th className="pl-3">Ejercicio</th><th>Estado</th><th></th></tr></thead><tbody>
          {sets.map(s => <tr key={s.id}><td className="pl-3"><a href={`/configuracion-fiscal?ver=${s.id}`} className="text-cobalt">{s.ejercicio} v{s.version}</a><div className="text-xs text-ink2">{s.vigenciaDesde.toISOString().slice(0, 10)} → {s.vigenciaHasta.toISOString().slice(0, 10)}</div></td>
            <td><span className={`text-xs px-1.5 py-0.5 rounded ${s.estado === 'vigente' ? 'bg-sage/15 text-sage' : s.estado === 'vencido' ? 'bg-line' : 'bg-amber/15 text-amber'}`}>{s.estado}</span></td>
            <td>{s.estado === 'borrador' && <form action={activarParamSet.bind(null, s.id)}><button className="text-xs text-cobalt">Activar</button></form>}</td></tr>)}
          {!sets.length && <tr><td colSpan={3} className="p-4 text-ink2 text-sm">Sin parámetros. Carga el JSON del ejercicio o ejecuta el seed.</td></tr>}
        </tbody></table></div>
        <p className="text-xs text-ink2 px-1">Al activar una versión, se vencen solo las vigentes cuya vigencia se traslape; puedes tener p.ej. una para enero y otra de febrero en adelante.</p>
        {aviso && <div className="card p-3 text-sm text-amber">TABLA_VENCIDA: los parámetros vigentes vencen en menos de 30 días. Carga el siguiente ejercicio.</div>}
        <form action={guardarParamSet} className="card p-4 space-y-2">
          <h2 className="font-semibold text-sm">Cargar nuevo ejercicio / versión</h2>
          <p className="text-xs text-ink2">Lo habitual es usar <b>Editar / crear nueva versión</b> sobre la vigente. Alternativamente pega el JSON con la misma estructura de <code>params-2026.json</code>. Se guarda como borrador y se activa aparte; el vigente anterior pasa a vencido. Los cálculos históricos conservan su hash.</p>
          <label><span className="lbl">Versión</span><input name="version" type="number" className="inp num" defaultValue={1} /></label>
          <textarea name="json" className="inp font-mono text-xs h-40" placeholder='{"ejercicio":2027,...}' required />
          <button className="btn">Guardar borrador</button>
        </form>
      </div>
      {p && <div className="space-y-4">
        <div className="flex items-baseline justify-between"><h1 className="text-xl font-semibold">Parámetros {p.ejercicio} v{sel!.version}</h1><span className="lbl font-mono">sha256 {sel!.hashSha256.slice(0, 16)}… · <a href={`/configuracion-fiscal/editar?ver=${sel!.id}`} className="text-cobalt font-sans normal-case tracking-normal">Editar / crear nueva versión</a></span></div>
        <div className="grid md:grid-cols-6 gap-3">
          {[['UMA diaria', p.uma_diaria], ['UMA mensual', p.uma_mensual], ['Salario mínimo', p.salario_minimo_general], ['SM frontera', p.salario_minimo_frontera], ['Tope cotización (UMA)', p.tope_cotizacion_umas], [`ISN ${p.isn.estado}`, p.isn.pct * 100],
            ['Comisión asimilables %', (p.asimilables_comision?.pct ?? 0) * 100], ['IVA comisión %', (p.asimilables_comision?.iva_pct ?? 0) * 100], ['Subsidio mensual', p.subsidio.monto_mensual], ['Límite subsidio', p.subsidio.limite_ingreso_mensual], ['Prima de riesgo %', p.empresa.prima_riesgo_trabajo * 100], ['Aguinaldo (días)', p.lft.dias_aguinaldo], ['Prima vacacional %', p.lft.prima_vacacional * 100], ['Tolerancia motor', p.motor.tolerancia]].map(([k, v]) =>
            <div key={k as string} className="border-l-2 border-dune pl-3"><div className="lbl">{k}</div><div className="num">{num(v as number)}</div></div>)}
        </div>
        {sel!.estado === 'vigente' && <form action={async (fd: FormData) => { 'use server'; await agregarComisionAsimilables(Number(fd.get('pct')) / 100, Number(fd.get('iva')) / 100); }} className="card p-3 flex flex-wrap items-end gap-3">
          <div className="text-sm"><b>Comisión por dispersión de asimilables</b><div className="text-xs text-ink2">Se calcula sobre el neto depositado por asimilables y forma parte del costo. Al guardar se crea la versión {sel!.version + 1} y se activa.</div></div>
          <label><span className="lbl">Comisión %</span><input name="pct" type="number" step="0.01" className="inp num w-24" defaultValue={(p.asimilables_comision?.pct ?? 0.05) * 100} /></label>
          <label><span className="lbl">IVA %</span><input name="iva" type="number" step="0.01" className="inp num w-24" defaultValue={(p.asimilables_comision?.iva_pct ?? 0.16) * 100} /></label>
          <button className="btn">Guardar como nueva versión</button></form>}
        <div className="grid md:grid-cols-2 gap-4">
          {(['quincenal', 'mensual'] as const).map(t => <div key={t} className="card p-3"><h3 className="font-semibold text-sm mb-2">Tarifa ISR {t} (art. 96)</h3>
            <table className="ledger w-full"><thead><tr><th className="r">Límite inf.</th><th className="r">Límite sup.</th><th className="r">Cuota fija</th><th className="r">% exc.</th></tr></thead><tbody>
              {p.isr[t].map((b, i) => <tr key={i}><td className="r">{num(b.li)}</td><td className="r">{b.ls === null ? 'En adelante' : num(b.ls)}</td><td className="r">{num(b.cf)}</td><td className="r">{num(b.pct * 100)}</td></tr>)}</tbody></table></div>)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-3"><h3 className="font-semibold text-sm mb-2">Cuotas IMSS</h3><table className="ledger w-full"><thead><tr><th>Ramo</th><th className="r">Patrón %</th><th className="r">Obrero %</th></tr></thead><tbody>
            {Object.entries(p.imss).filter(([, v]) => typeof v === 'object' && v !== null && !Array.isArray(v)).map(([k, v]) => { const r = v as { patron: number; obrero: number }; return <tr key={k}><td>{k.replace(/_/g, ' ')}</td><td className="r">{num(r.patron * 100, 3)}</td><td className="r">{num(r.obrero * 100, 3)}</td></tr>; })}
            <tr><td>cesantía y vejez obrero</td><td className="r">—</td><td className="r">{num(p.imss.cesantia_vejez_obrero * 100, 3)}</td></tr></tbody></table></div>
          <div className="card p-3"><h3 className="font-semibold text-sm mb-2">Cesantía y vejez patronal (transitoria)</h3><table className="ledger w-full"><thead><tr><th>Rango SBC</th><th className="r">Patrón %</th></tr></thead><tbody>
            {p.imss.cesantia_vejez_patron.map((r, i) => <tr key={i}><td>{r.hasta === null ? `> ${r.desde} ${r.unidad}` : `${r.desde} – ${r.hasta} ${r.unidad}`}</td><td className="r">{num(r.pct * 100, 3)}</td></tr>)}</tbody></table></div>
        </div>
      </div>}
    </div>
  );
}
