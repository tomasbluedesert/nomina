'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import type { ResultadoTrabajador as R } from '@engine';
import { num } from '@/lib/format';
import { ResultadoTrabajador } from './ResultadoTrabajador';

type Fila = { empleado: string; nombre: string; resultado?: R; error?: string };
type Col = [string, (r: R) => number | string];
const ESQ: Record<string, string> = { fiscal: 'Fiscal', mixto: 'Mixto', asimilables: 'Asimilables' };

const colsFiscal: Col[] = [['Esquema', r => ESQ[r.esquema]], ['Días', r => r.nomina.dias_pagados], ['SD fiscal', r => r.nomina.sueldo_diario], ['Sueldo', r => r.nomina.sueldo ?? r.nomina.bruto_fiscal], ['Vacaciones', r => r.nomina.vacaciones ?? 0], ['Prima vac.', r => r.nomina.prima_vacacional ?? 0], ['Prima dom.', r => r.nomina.prima_dominical ?? 0], ['Festivos', r => r.nomina.pago_festivos ?? 0], ['Pagos extra', r => r.nomina.extras_fiscal ?? 0], ['Bruto fiscal', r => r.nomina.bruto_fiscal], ['ISR tarifa', r => r.nomina.isr_tarifa], ['Subsidio', r => r.nomina.subsidio], ['ISR retenido', r => r.nomina.isr_nomina], ['SBC', r => r.nomina.sbc], ['IMSS trabajador', r => r.nomina.imss_obrero], ['Infonavit', r => r.nomina.descuentos_detalle?.infonavit ?? 0], ['Fonacot', r => r.nomina.descuentos_detalle?.fonacot ?? 0], ['Préstamo', r => r.nomina.descuentos_detalle?.prestamo ?? 0], ['Pensión', r => r.nomina.descuentos_detalle?.pension ?? 0], ['Neto fiscal', r => r.nomina.neto_fiscal], ['IMSS patronal', r => r.cargas.imss_patron], ['INFONAVIT', r => r.cargas.infonavit], ['SAR', r => r.cargas.sar], ['CyV', r => r.cargas.cesantia_vejez], ['ISN', r => r.cargas.isn], ['Prov. aguinaldo', r => r.cargas.prestaciones_detalle.aguinaldo], ['Prov. prima vac.', r => r.cargas.prestaciones_detalle.prima_vacacional], ['Costo fiscal', r => r.nomina.bruto_fiscal + r.cargas.total - (r.cargas.comision_asimilables ?? 0) - (r.cargas.iva_comision ?? 0)]];
const colsAsim: Col[] = [['Esquema', r => ESQ[r.esquema]], ['Días', r => r.nomina.dias_pagados], ['SD libre', r => r.esquema === 'asimilables' ? r.nomina.sueldo_diario : 0], ['Neto pactado días', r => r.asimilables.neto_pactado_dias ?? r.neto_pactado], ['Primas s/pactado', r => r.asimilables.extras_pactado ?? 0], ['Pagos extra (neto)', r => r.asimilables.extras_neto ?? 0], ['Neto objetivo', r => r.neto_pactado], ['Neto fiscal', r => r.nomina.neto_fiscal], ['Neto asimilable', r => r.asimilables.neto], ['Bruto asimilable', r => r.asimilables.bruto], ['ISR asimilables', r => r.asimilables.isr], ['Comisión 5%', r => r.cargas.comision_asimilables ?? 0], ['IVA comisión', r => r.cargas.iva_comision ?? 0], ['Costo asimilables', r => r.asimilables.bruto + (r.cargas.comision_asimilables ?? 0) + (r.cargas.iva_comision ?? 0)], ['Diferencia', r => r.diferencia]];
const colsCons: Col[] = [['Esquema', r => ESQ[r.esquema]], ['Bruto fiscal', r => r.nomina.bruto_fiscal], ['Bruto asimilable', r => r.asimilables.bruto], ['ISR total', r => r.nomina.isr_nomina + r.asimilables.isr], ['IMSS trabajador', r => r.nomina.imss_obrero], ['Neto total', r => r.neto_total], ['Neto pactado', r => r.neto_pactado], ['Diferencia', r => r.diferencia], ['Cargas patronales', r => r.cargas.total], ['Costo real', r => r.costo_real_total], ['Costo/neto', r => r.relacion_costo_neto]];

function AcumuladoTotal({ r, total, fiscal, mixto, asim, periodo }: { r: R; total: number; fiscal: number; mixto: number; asim: number; periodo: string }) {
  const exportar = () => {
    const n = r.nomina, a = r.asimilables, g = r.cargas;
    const aoa: (string | number)[][] = [['Concepto', 'Importe'], ['Trabajadores', total], ['Fiscal', fiscal], ['Mixto', mixto], ['Asimilables', asim], ['Días pagados (suma)', n.dias_pagados], ['Sueldo', n.sueldo], ['Vacaciones', n.vacaciones], ['Prima vacacional', n.prima_vacacional], ['Prima dominical', n.prima_dominical], ['Festivos trabajados', n.pago_festivos], ['Pagos extraordinarios fiscal', n.extras_fiscal], ['Sueldo bruto fiscal', n.bruto_fiscal], ['ISR tarifa', n.isr_tarifa], ['Subsidio al empleo', n.subsidio], ['ISR nómina', n.isr_nomina], ['IMSS trabajador', n.imss_obrero], ['Descuentos (Infonavit, Fonacot, préstamos, pensión)', n.otras_deducciones], ['Neto nómina fiscal', n.neto_fiscal],
      ['Pagos extraordinarios asimilables (neto)', a.extras_neto], ['Neto faltante', a.neto_objetivo], ['Bruto asimilables', a.bruto], ['ISR asimilables', a.isr], ['Neto asimilables', a.neto], ['Neto total trabajadores', r.neto_total], ['Neto pactado', r.neto_pactado], ['Diferencia', r.diferencia],
      ['IMSS patronal', g.imss_patron], ['INFONAVIT', g.infonavit], ['SAR', g.sar], ['Cesantía y vejez', g.cesantia_vejez], ['Impuesto sobre nómina', g.isn], ['Comisión asimilables', g.comision_asimilables], ['IVA comisión', g.iva_comision], ['Prov. aguinaldo', g.prestaciones_detalle.aguinaldo], ['Prov. prima vacacional', g.prestaciones_detalle.prima_vacacional], ['Total cargas patronales', g.total], ['Costo real total', r.costo_real_total],
      ['Carga laboral', r.carga_laboral], ['% carga / neto', r.pct_carga_sobre_neto], ['% carga / costo', r.pct_carga_sobre_costo], ['Relación costo/neto', r.relacion_costo_neto]];
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 30 }, { wch: 16 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Acumulado'); XLSX.writeFile(wb, `Acumulado_total_${periodo}.xlsx`);
  };
  return <div className="space-y-2">
    <div className="flex items-center gap-4 text-sm"><span><b className="num text-lg">{total}</b> trabajadores</span><span className="text-ink2">fiscal <b className="num">{fiscal}</b> · mixto <b className="num">{mixto}</b> · asimilables <b className="num">{asim}</b></span><button className="btn-ghost ml-auto" onClick={exportar}>Exportar Excel</button></div>
    <ResultadoTrabajador r={r} titulo={`Acumulado total del periodo`} />
    <p className="text-xs text-ink2">En el bloque de nómina fiscal, "Sueldo diario", "Días pagados", "SDI" y "SBC" son sumas de toda la plantilla (referencia, no promedio).</p>
  </div>;
}

function Tabla({ filas, cols, titulo, periodo }: { filas: Fila[]; cols: Col[]; titulo: string; periodo: string }) {
  const ok = filas.filter(f => f.resultado);
  const tot = cols.map(([, f]) => ok.reduce((a, x) => { const v = f(x.resultado!); return typeof v === 'number' ? a + v : a; }, 0));
  const exportar = () => {
    const aoa = [['No.', 'Nombre', ...cols.map(c => c[0])], ...ok.map(x => [x.empleado, x.nombre, ...cols.map(([, f]) => f(x.resultado!))]), ['', 'TOTAL', ...cols.map(([k], i) => ['Esquema', 'Días', 'SD fiscal', 'SD libre', 'SBC', 'Costo/neto'].includes(k) ? '' : Math.round(tot[i] * 100) / 100)]];
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = aoa[0].map((_, i) => ({ wch: i === 1 ? 32 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, titulo.slice(0, 30)); XLSX.writeFile(wb, `${titulo.replace(/\s+/g, '_')}_${periodo}.xlsx`);
  };
  return <div className="card p-4 overflow-x-auto">
    <div className="flex items-center justify-between mb-2"><h3 className="font-semibold">{titulo} <span className="lbl ml-2">{ok.length} trabajadores</span></h3><button className="btn-ghost" onClick={exportar} disabled={!ok.length}>Exportar Excel</button></div>
    <table className="ledger w-full text-xs"><thead><tr><th>No.</th><th>Nombre</th>{cols.map(c => <th key={c[0]} className={c[0] === 'Esquema' ? '' : 'r'}>{c[0]}</th>)}</tr></thead><tbody>
      {ok.map(x => <tr key={x.empleado}><td className="num">{x.empleado}</td><td>{x.nombre}</td>{cols.map(([k, f]) => { const v = f(x.resultado!); return <td key={k} className={typeof v === 'number' ? `r ${k === 'Diferencia' && Math.abs(v) > 0.01 ? 'text-ember' : ''}` : ''}>{typeof v === 'number' ? (k === 'Días' ? v : num(v)) : v}</td>; })}</tr>)}
      <tr className="font-semibold"><td></td><td>Total</td>{cols.map(([k], i) => <td key={k} className="r">{['Esquema', 'Días', 'SD fiscal', 'SD libre', 'SBC', 'Costo/neto'].includes(k) ? '' : num(tot[i])}</td>)}</tr>
    </tbody></table>
    {!ok.length && <p className="text-center text-ink2 py-4">Sin trabajadores en este reporte.</p>}
  </div>;
}

/** Suma los resultados de varios trabajadores en una sola estructura para mostrarla con la tabla estándar. */
export function acumular(rs: R[]): R {
  const sum = (f: (r: R) => number) => Math.round(rs.reduce((a, r) => a + (f(r) || 0), 0) * 100) / 100;
  const sumMap = (f: (r: R) => Record<string, number>) => rs.reduce((m, r) => { for (const [k, v] of Object.entries(f(r) ?? {})) m[k] = Math.round(((m[k] ?? 0) + v) * 100) / 100; return m; }, {} as Record<string, number>);
  const neto_total = sum(r => r.neto_total), costo = sum(r => r.costo_real_total), carga = Math.round((costo - neto_total) * 100) / 100;
  const warnings = rs.flatMap(r => r.warnings).reduce((a, w) => a.some(x => x.codigo === w.codigo) ? a : [...a, { ...w, mensaje: `${rs.filter(r => r.warnings.some(y => y.codigo === w.codigo)).length} trabajador(es): ${w.mensaje}` }], [] as R['warnings']);
  return {
    periodo: rs[0]?.periodo, esquema: 'mixto',
    nomina: { dias_pagados: sum(r => r.nomina.dias_pagados), sueldo_diario: sum(r => r.nomina.sueldo_diario), bruto_fiscal: sum(r => r.nomina.bruto_fiscal), dias_sueldo: sum(r => r.nomina.dias_sueldo ?? r.nomina.dias_pagados), sueldo: sum(r => r.nomina.sueldo ?? r.nomina.bruto_fiscal), dias_vacaciones: sum(r => r.nomina.dias_vacaciones ?? 0), vacaciones: sum(r => r.nomina.vacaciones ?? 0), prima_vacacional: sum(r => r.nomina.prima_vacacional ?? 0), prima_exenta: sum(r => r.nomina.prima_exenta ?? 0), prima_gravada: sum(r => r.nomina.prima_gravada ?? 0), domingos: sum(r => r.nomina.domingos ?? 0), prima_dominical: sum(r => r.nomina.prima_dominical ?? 0), prima_dominical_exenta: sum(r => r.nomina.prima_dominical_exenta ?? 0), festivos: sum(r => r.nomina.festivos ?? 0), pago_festivos: sum(r => r.nomina.pago_festivos ?? 0), extras_fiscal: sum(r => r.nomina.extras_fiscal ?? 0), festivos_exento: sum(r => r.nomina.festivos_exento ?? 0), base_gravada: sum(r => r.nomina.base_gravada ?? r.nomina.bruto_fiscal), ajuste_neto: sum(r => r.nomina.ajuste_neto ?? 0), isr_tarifa: sum(r => r.nomina.isr_tarifa), subsidio: sum(r => r.nomina.subsidio), isr_nomina: sum(r => r.nomina.isr_nomina), subsidio_entregado: sum(r => r.nomina.subsidio_entregado), sdi: sum(r => r.nomina.sdi), sdi_fuente: 'calculado', factor_integracion: 0, sbc: sum(r => r.nomina.sbc), imss_obrero: sum(r => r.nomina.imss_obrero), imss_obrero_detalle: sumMap(r => r.nomina.imss_obrero_detalle), otras_deducciones: sum(r => r.nomina.otras_deducciones), descuentos_detalle: sumMap(r => r.nomina.descuentos_detalle ?? {}), neto_fiscal_sin_descuentos: sum(r => r.nomina.neto_fiscal_sin_descuentos ?? r.nomina.neto_fiscal + (r.nomina.otras_deducciones ?? 0)), neto_fiscal: sum(r => r.nomina.neto_fiscal) },
    asimilables: { neto_objetivo: sum(r => r.asimilables.neto_objetivo), neto_pactado_dias: sum(r => r.asimilables.neto_pactado_dias ?? 0), extras_pactado: sum(r => r.asimilables.extras_pactado ?? 0), extras_neto: sum(r => r.asimilables.extras_neto ?? 0), bruto: sum(r => r.asimilables.bruto), isr: sum(r => r.asimilables.isr), neto: sum(r => r.asimilables.neto), metodo: 'acumulado', iteraciones: 0, diff: sum(r => r.asimilables.diff) },
    cargas: { imss_patron: sum(r => r.cargas.imss_patron), imss_patron_detalle: sumMap(r => r.cargas.imss_patron_detalle), infonavit: sum(r => r.cargas.infonavit), sar: sum(r => r.cargas.sar), cesantia_vejez: sum(r => r.cargas.cesantia_vejez), isn: sum(r => r.cargas.isn), comision_asimilables: sum(r => r.cargas.comision_asimilables ?? 0), iva_comision: sum(r => r.cargas.iva_comision ?? 0), prestaciones_periodo: sum(r => r.cargas.prestaciones_periodo), prestaciones_detalle: sumMap(r => r.cargas.prestaciones_detalle), otras_cargas: sum(r => r.cargas.otras_cargas), total: sum(r => r.cargas.total) },
    neto_total, neto_pactado: sum(r => r.neto_pactado), diferencia: sum(r => r.diferencia), costo_real_total: costo, carga_laboral: carga,
    pct_carga_sobre_neto: neto_total ? Math.round(carga / neto_total * 1000) / 10 : 0, pct_carga_sobre_costo: costo ? Math.round(carga / costo * 1000) / 10 : 0, relacion_costo_neto: neto_total ? Math.round(costo / neto_total * 10000) / 10000 : 0, warnings,
  } as R;
}

export function ReportesNomina({ filas, periodo }: { filas: Fila[]; periodo: string }) {
  const [tab, setTab] = useState<'fiscal' | 'asim' | 'cons' | 'detalle' | 'acum'>('cons');
  const fiscal = filas.filter(f => f.resultado && f.resultado.esquema !== 'asimilables');
  const asim = filas.filter(f => f.resultado && f.resultado.esquema !== 'fiscal');
  const todos = filas.filter(f => f.resultado).map(f => f.resultado!);
  const n = (k: string) => todos.filter(r => r.esquema === k).length;
  return <div className="space-y-3">
    <div className="flex gap-2 flex-wrap">{([['cons', 'Consolidado'], ['fiscal', 'Nómina fiscal'], ['asim', 'Nómina de asimilables'], ['detalle', 'Detalle por trabajador'], ['acum', 'Acumulado total']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={tab === k ? 'btn' : 'btn-ghost'}>{l}</button>)}</div>
    {tab === 'cons' && <Tabla filas={filas} cols={colsCons} titulo="Consolidado" periodo={periodo} />}
    {tab === 'fiscal' && <Tabla filas={fiscal} cols={colsFiscal} titulo="Nomina fiscal" periodo={periodo} />}
    {tab === 'asim' && <Tabla filas={asim} cols={colsAsim} titulo="Nomina asimilables" periodo={periodo} />}
    {tab === 'acum' && todos.length > 0 && <AcumuladoTotal r={acumular(todos)} total={todos.length} fiscal={n('fiscal')} mixto={n('mixto')} asim={n('asimilables')} periodo={periodo} />}
    {tab === 'detalle' && filas.map(f => f.resultado ? <ResultadoTrabajador key={f.empleado} r={f.resultado} titulo={`${f.empleado} · ${f.nombre} · ${ESQ[f.resultado.esquema]}`} /> : <div key={f.empleado} className="card p-3 text-ember text-sm">{f.empleado} {f.nombre}: {f.error}</div>)}
    {filas.some(f => f.error) && tab !== 'detalle' && <div className="card p-3 text-ember text-sm">{filas.filter(f => f.error).map(f => <div key={f.empleado}>{f.empleado} {f.nombre}: {f.error}</div>)}</div>}
  </div>;
}
