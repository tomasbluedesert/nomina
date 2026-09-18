'use client';
import { useEffect, useState, useTransition } from 'react';
import { guardarCodigos, leerCodigos, guardarReglaSinMarca, leerReglaSinMarca } from '@/lib/actions';
type C = { codigo: string; nombre: string; paga: boolean; trabaja?: boolean };
export function CodigosAsistencia() {
  const [cods, setCods] = useState<C[]>([]); const [msg, setMsg] = useState(''); const [pending, start] = useTransition();
  const [sinMarca, setSinMarca] = useState<'paga' | 'no_paga'>('no_paga');
  useEffect(() => { leerCodigos().then(setCods); leerReglaSinMarca().then(setSinMarca); }, []);
  const upd = (i: number, p: Partial<C>) => setCods(cods.map((c, j) => j === i ? { ...c, ...p } : c));
  return <div className="card p-4 space-y-2">
    <h2 className="font-semibold">3. Códigos de asistencia</h2>
    <p className="text-sm text-ink2">Define qué marcas cuentan como día pagado y cuáles como día trabajado. Un día trabajado en domingo genera prima dominical; en festivo (tabla de festivos de asistencias o marca DF) genera pago extra.</p>
    <label className="flex items-center gap-2 text-sm"><span className="lbl">Días sin marca (guiones):</span>
      <select className="inp w-auto py-0.5" value={sinMarca} onChange={e => { const v = e.target.value as 'paga' | 'no_paga'; setSinMarca(v); guardarReglaSinMarca(v); }}>
        <option value="no_paga">No se pagan (solo cuenta lo marcado)</option><option value="paga">Se pagan como asistencia</option></select></label>
    <table className="ledger w-full text-sm"><thead><tr><th>Código</th><th>Significado</th><th>Paga el día</th><th>Día trabajado</th><th></th></tr></thead><tbody>
      {cods.map((c, i) => <tr key={i}><td><input className="inp w-20 py-0.5 font-mono" value={c.codigo} onChange={e => upd(i, { codigo: e.target.value.toUpperCase() })} /></td>
        <td><input className="inp py-0.5" value={c.nombre} onChange={e => upd(i, { nombre: e.target.value })} /></td>
        <td><label className="flex items-center gap-2"><input type="checkbox" checked={c.paga} onChange={e => upd(i, { paga: e.target.checked })} />{c.paga ? 'Sí' : 'No (descuenta)'}</label></td>
        <td><label className="flex items-center gap-2"><input type="checkbox" checked={!!c.trabaja} onChange={e => upd(i, { trabaja: e.target.checked })} />{c.trabaja ? 'Sí' : 'No'}</label></td>
        <td><button className="text-ember text-xs" onClick={() => setCods(cods.filter((_, j) => j !== i))}>quitar</button></td></tr>)}
    </tbody></table>
    <div className="flex gap-2"><button className="btn-ghost" onClick={() => setCods([...cods, { codigo: '', nombre: '', paga: true }])}>+ Código</button>
      <button className="btn" disabled={pending} onClick={() => start(async () => { await guardarCodigos(JSON.stringify(cods.filter(c => c.codigo))); setMsg('Guardado'); setTimeout(() => setMsg(''), 2000); })}>Guardar códigos</button><span className="text-sm text-sage self-center">{msg}</span></div>
  </div>;
}
