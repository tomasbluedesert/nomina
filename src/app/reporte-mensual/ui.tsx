'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import type { ResultadoTrabajador as R } from '@engine';
import { num } from '@/lib/format';
import { ResultadoTrabajador } from '@/components/ResultadoTrabajador';
import { acumular } from '@/components/ReportesNomina';
type Fila = { periodo: string; numero: string; nombre: string; esquema: string; grupo: string; r: R };
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function ReporteMensual({ anio, mes, por, periodos, filas }: { anio: number; mes: number; por: string; periodos: string[]; filas: Fila[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const grupos = [...new Set(filas.map(f => f.grupo))].sort();
  const porGrupo = grupos.map(g => { const fs = filas.filter(f => f.grupo === g); return { g, n: new Set(fs.map(f => f.numero)).size, a: acumular(fs.map(f => f.r)) }; }).sort((x, y) => y.a.costo_real_total - x.a.costo_real_total);
  const total = acumular(filas.map(f => f.r)); const nTotal = new Set(filas.map(f => f.numero)).size;
  const cols: [string, (a: R) => number][] = [['Bruto fiscal', a => a.nomina.bruto_fiscal], ['Bruto asimilables', a => a.asimilables.bruto], ['ISR retenido', a => a.nomina.isr_nomina + a.asimilables.isr], ['IMSS trabajador', a => a.nomina.imss_obrero], ['Neto pagado', a => a.neto_total], ['IMSS patronal', a => a.cargas.imss_patron], ['INFONAVIT+SAR+CyV', a => a.cargas.infonavit + a.cargas.sar + a.cargas.cesantia_vejez], ['ISN', a => a.cargas.isn], ['Comisión+IVA', a => (a.cargas.comision_asimilables ?? 0) + (a.cargas.iva_comision ?? 0)], ['Provisiones', a => a.cargas.prestaciones_periodo], ['Cargas patronales', a => a.cargas.total], ['Costo real', a => a.costo_real_total], ['Costo/neto', a => a.relacion_costo_neto]];
  const exportar = () => {
    const wb = XLSX.utils.book_new();
    const aoa = [[por === 'centro' ? 'Centro de costos' : 'Departamento', 'Trabajadores', ...cols.map(c => c[0])], ...porGrupo.map(x => [x.g, x.n, ...cols.map(([, f]) => Math.round(f(x.a) * 100) / 100)]), ['TOTAL', nTotal, ...cols.map(([, f]) => Math.round(f(total) * 100) / 100)]];
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = aoa[0].map((_, i) => ({ wch: i === 0 ? 28 : 15 })); XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
    const det = [['Grupo', 'Periodo', 'No.', 'Nombre', 'Esquema', 'Días', 'Bruto fiscal', 'Bruto asimilables', 'ISR', 'Neto', 'Cargas', 'Costo real'], ...filas.map(f => [f.grupo, f.periodo, f.numero, f.nombre, f.esquema, f.r.nomina.dias_pagados, f.r.nomina.bruto_fiscal, f.r.asimilables.bruto, f.r.nomina.isr_nomina + f.r.asimilables.isr, f.r.neto_total, f.r.cargas.total, f.r.costo_real_total])];
    const ws2 = XLSX.utils.aoa_to_sheet(det); ws2['!cols'] = det[0].map((_, i) => ({ wch: i === 3 ? 30 : 14 })); XLSX.utils.book_append_sheet(wb, ws2, 'Detalle');
    XLSX.writeFile(wb, `Reporte_mensual_${anio}-${String(mes).padStart(2, '0')}_${por}.xlsx`);
  };
  const nav = (a: number, m: number, p = por) => `/reporte-mensual?anio=${a}&mes=${m}&por=${p}`;
  return <div className="space-y-4">
    <div className="card p-4 flex flex-wrap items-center gap-3">
      <a href={nav(mes === 1 ? anio - 1 : anio, mes === 1 ? 12 : mes - 1)} className="btn-ghost">‹</a>
      <h1 className="text-xl font-semibold">{MESES[mes - 1]} {anio}</h1>
      <a href={nav(mes === 12 ? anio + 1 : anio, mes === 12 ? 1 : mes + 1)} className="btn-ghost">›</a>
      <div className="flex gap-1 text-xs ml-2">{[['departamento', 'Por departamento'], ['centro', 'Por centro de costos']].map(([k, l]) => <a key={k} href={nav(anio, mes, k)} className={`px-2 py-1 rounded border ${por === k ? 'border-cobalt text-cobalt' : 'border-line'}`}>{l}</a>)}</div>
      <span className="text-xs text-ink2 ml-auto">{periodos.length ? `Periodos incluidos: ${periodos.join(' · ')}` : 'Sin nóminas guardadas en este mes'}</span>
      <button className="btn-ghost" onClick={exportar} disabled={!filas.length}>Exportar Excel</button>
    </div>
    {filas.length > 0 && <>
      <div className="card p-4 overflow-x-auto"><table className="ledger w-full text-xs"><thead><tr><th>{por === 'centro' ? 'Centro de costos' : 'Departamento'}</th><th className="r">Trab.</th>{cols.map(c => <th key={c[0]} className="r">{c[0]}</th>)}<th></th></tr></thead><tbody>
        {porGrupo.map(x => <tr key={x.g} className={abierto === x.g ? 'bg-cobalt/5' : ''}><td>{x.g}</td><td className="r">{x.n}</td>{cols.map(([k, f]) => <td key={k} className="r">{num(f(x.a))}</td>)}<td><button className="text-cobalt" onClick={() => setAbierto(abierto === x.g ? null : x.g)}>{abierto === x.g ? 'cerrar' : 'ver'}</button></td></tr>)}
        <tr className="font-semibold"><td>Total</td><td className="r">{nTotal}</td>{cols.map(([k, f]) => <td key={k} className="r">{num(f(total))}</td>)}<td></td></tr>
      </tbody></table></div>
      {abierto && <ResultadoTrabajador r={porGrupo.find(x => x.g === abierto)!.a} titulo={`${abierto} · ${MESES[mes - 1]} ${anio} · ${porGrupo.find(x => x.g === abierto)!.n} trabajadores`} />}
      <ResultadoTrabajador r={total} titulo={`Acumulado total · ${MESES[mes - 1]} ${anio} · ${nTotal} trabajadores`} />
    </>}
  </div>;
}
