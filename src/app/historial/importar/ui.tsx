'use client';
import { useRef, useState, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { importarNominaHistorica, type LineaHist } from '@/lib/import-historico';
export function ImportadorHistorico() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [hojas, setHojas] = useState<string[]>([]); const [hoja, setHoja] = useState('');
  const [res, setRes] = useState<{ lineas: LineaHist[]; resumen: Record<string, number>; periodo?: string } | null>(null);
  const [err, setErr] = useState(''); const [pending, start] = useTransition();
  const color: Record<string, string> = { importado: 'text-sage', error: 'text-ember', omitido: 'text-ink2/60' };
  const alElegir = async (f: File | null) => {
    setArchivo(f); setRes(null); setErr(''); setHojas([]); setHoja('');
    if (!f) return;
    try { const wb = XLSX.read(await f.arrayBuffer(), { bookSheets: true }); setHojas(wb.SheetNames); setHoja(wb.SheetNames[0] ?? ''); }
    catch { setErr('No pude leer el archivo; verifica que sea .xlsx'); }
  };
  const importar = () => start(async () => {
    if (!archivo) { setErr('Selecciona el archivo'); return; }
    setErr('');
    try { const fd = new FormData(); fd.set('archivo', archivo); fd.set('hoja', hoja); setRes(await importarNominaHistorica(fd)); }
    catch (e) { setErr((e as Error).message); }
  });
  return <div className="space-y-4 max-w-5xl">
    <div className="flex items-baseline justify-between"><h1 className="text-xl font-semibold">Importar nómina histórica</h1><a href="/historial" className="text-sm text-cobalt">← Historial</a></div>
    <div className="card p-4 text-sm text-ink2 space-y-1">
      <p>Sube el Excel de extracción de recibos y elige la hoja del periodo (una quincena o mes por hoja; la de acumulado anual no se importa). Las filas fiscal y de asimilados de cada persona se cruzan por RFC y el periodo queda en el Historial marcado como <b>importado</b>.</p>
      <p>Requisito: el RFC debe existir en Empleados. Los recibos no traen cargas patronales, así que el costo real de lo importado es solo bruto fiscal + asimilables.</p>
    </div>
    <div className="card p-4 flex flex-wrap items-end gap-3">
      <label className="flex-1"><span className="lbl">Archivo (.xlsx)</span><input ref={fileRef} type="file" accept=".xlsx,.xls" className="inp" onChange={e => alElegir(e.target.files?.[0] ?? null)} /></label>
      {hojas.length > 0 && <label><span className="lbl">Hoja (periodo)</span><select className="inp" value={hoja} onChange={e => setHoja(e.target.value)}>{hojas.map(h => <option key={h}>{h}</option>)}</select></label>}
      <button className="btn" disabled={pending || !archivo || !hoja} onClick={importar}>{pending ? 'Importando…' : 'Importar hoja'}</button>
    </div>
    {err && <div className="card p-3 text-ember text-sm">{err}</div>}
    {res && <div className="card p-4">
      <div className="flex gap-5 mb-3 text-sm flex-wrap"><span className="lbl">Periodo {res.periodo}</span>{Object.entries(res.resumen).map(([k, v]) => <span key={k} className={color[k]}><b className="num text-lg">{v}</b> {k}</span>)}<a href="/historial" className="text-cobalt ml-auto">Ver en Historial →</a></div>
      <table className="ledger w-full text-sm"><thead><tr><th>RFC</th><th>Nombre</th><th>Resultado</th><th>Detalle</th></tr></thead><tbody>
        {res.lineas.map(l => <tr key={l.rfc}><td className="num text-xs">{l.rfc}</td><td>{l.nombre}</td><td className={color[l.accion]}>{l.accion}</td><td className="text-xs text-ink2">{l.detalle}</td></tr>)}
      </tbody></table></div>}
  </div>;
}
