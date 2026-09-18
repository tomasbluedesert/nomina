import type { ResultadoTrabajador as R } from '@engine';
import { num } from '@/lib/format';
/** Vista estándar por trabajador (formato del Ejemplo 1): tres bloques + barra de destino de cada peso. */
export function ResultadoTrabajador({ r, titulo }: { r: R; titulo?: string }) {
  const n = r.nomina, a = r.asimilables, g = r.cargas;
  if (!n || !a || !g) return <div className="card p-4 text-ember text-sm">Resultado incompleto o de una versión anterior; recalcula el periodo.</div>;
  const total = r.costo_real_total || 1;
  const seg = [
    ['Neto trabajador', r.neto_total, 'bg-cobalt'],
    ['ISR', (n.isr_nomina ?? 0) + (a.isr ?? 0), 'bg-ink2'],
    ['IMSS obrero', n.imss_obrero ?? 0, 'bg-ink2/60'],
    ['Cargas patronales', g.total ?? 0, 'bg-dune'],
  ] as const;
  const Row = ({ k, v, b }: { k: string; v: number; b?: boolean }) => <tr className={b ? 'font-semibold' : ''}><td>{k}</td><td className="r">{num(v ?? 0)}</td></tr>;
  return (
    <div className="card p-4">
      {titulo && <div className="flex items-baseline justify-between mb-3"><h3 className="font-semibold">{titulo}</h3><span className="lbl">{n.dias_pagados} días · {r.periodo.fecha_inicio} → {r.periodo.fecha_fin}</span></div>}
      <div className="h-2.5 w-full flex rounded overflow-hidden mb-1" title="Destino de cada peso del costo real">
        {seg.map(([k, v, c]) => <div key={k} className={c} style={{ width: `${((v || 0) / total) * 100}%` }} title={`${k}: ${num(v || 0)}`} />)}
      </div>
      <div className="flex gap-4 mb-4 text-xs text-ink2">{seg.map(([k, v, c]) => <span key={k} className="flex items-center gap-1"><i className={`inline-block w-2 h-2 rounded-sm ${c}`} />{k} <b className="num">{num((v / total) * 100, 1)}%</b></span>)}</div>
      <div className="grid md:grid-cols-3 gap-5">
        <table className="ledger w-full"><thead><tr><th>Nómina fiscal</th><th className="r">MXN</th></tr></thead><tbody>
          <Row k="Sueldo diario fiscal" v={n.sueldo_diario ?? 0} /><Row k="Días pagados" v={n.dias_pagados ?? 0} />
          {(n.vacaciones ?? 0) + (n.prima_vacacional ?? 0) + (n.prima_dominical ?? 0) + (n.pago_festivos ?? 0) + (n.extras_fiscal ?? 0) > 0 ? <>
            <Row k={(n.dias_sueldo ?? 0) > 0 ? `Sueldo (${n.dias_sueldo} días)` : 'Sueldo'} v={n.sueldo ?? n.bruto_fiscal} />
            {(n.vacaciones ?? 0) > 0 && <Row k={(n.dias_vacaciones ?? 0) > 0 ? `Vacaciones (${n.dias_vacaciones} días)` : 'Vacaciones'} v={n.vacaciones} />}
            {(n.prima_vacacional ?? 0) > 0 && <Row k="Prima vacacional" v={n.prima_vacacional} />}
            {(n.prima_dominical ?? 0) > 0 && <Row k={(n.domingos ?? 0) > 0 ? `Prima dominical (${n.domingos})` : 'Prima dominical'} v={n.prima_dominical} />}
            {(n.pago_festivos ?? 0) > 0 && <Row k={(n.festivos ?? 0) > 0 ? `Festivos trabajados (${n.festivos})` : 'Días festivos'} v={n.pago_festivos} />}
            {(n.extras_fiscal ?? 0) > 0 && <Row k="Aguinaldo / pagos extraordinarios" v={n.extras_fiscal} />}
            <Row k="Sueldo bruto fiscal" v={n.bruto_fiscal} b /><Row k="Base gravada ISR" v={n.base_gravada ?? n.bruto_fiscal} /></> : <Row k="Sueldo bruto fiscal" v={n.bruto_fiscal} />}
          <Row k="ISR tarifa" v={n.isr_tarifa} /><Row k="Subsidio al empleo" v={n.subsidio} /><Row k="ISR nómina" v={n.isr_nomina} />
          <Row k={n.sdi_fuente === 'registrado' ? 'SDI (registrado)' : `SDI (factor ${num(n.factor_integracion ?? 0, 4)})`} v={n.sdi} /><Row k="SBC" v={n.sbc} /><Row k="IMSS trabajador" v={n.imss_obrero} />
          {(n.ajuste_neto ?? 0) !== 0 && <Row k="Ajuste al neto" v={n.ajuste_neto!} />}
          {(n.otras_deducciones ?? 0) > 0 && <><Row k="Neto antes de descuentos" v={n.neto_fiscal_sin_descuentos ?? n.neto_fiscal + n.otras_deducciones} />
            {Object.entries(n.descuentos_detalle ?? { otros: n.otras_deducciones }).map(([k, v]) => <Row key={k} k={`Desc. ${({ infonavit: 'Infonavit', fonacot: 'Fonacot', prestamo: 'Préstamo', pension: 'Pensión alimenticia', otros: 'Otros' } as Record<string, string>)[k] ?? k}`} v={v} />)}</>}
          <Row k="Neto nómina fiscal" v={n.neto_fiscal} b />
        </tbody></table>
        <table className="ledger w-full"><thead><tr><th>Asimilables y neto</th><th className="r">MXN</th></tr></thead><tbody>
          {(a.extras_pactado ?? 0) + (a.extras_neto ?? 0) > 0 && <><Row k="Neto pactado por días" v={a.neto_pactado_dias} />{(a.extras_pactado ?? 0) > 0 && <Row k="Primas sobre SD pactado" v={a.extras_pactado} />}{(a.extras_neto ?? 0) > 0 && <Row k="Pagos extraordinarios (neto)" v={a.extras_neto} />}</>}
          <Row k="Neto faltante" v={a.neto_objetivo} /><Row k="Bruto asimilables" v={a.bruto} /><Row k="ISR asimilables" v={a.isr} /><Row k="Neto asimilables" v={a.neto} />
          <Row k="Neto total trabajador" v={r.neto_total} b /><Row k="Sueldo neto pactado" v={r.neto_pactado} />
          <tr className={`font-semibold ${Math.abs(r.diferencia) > 0.01 ? 'text-ember' : 'text-sage'}`}><td>Diferencia</td><td className="r">{num(r.diferencia)}</td></tr>
        </tbody></table>
        <table className="ledger w-full"><thead><tr><th>Costo empresa</th><th className="r">MXN</th></tr></thead><tbody>
          <Row k="IMSS patronal (incl. RT)" v={g.imss_patron} /><Row k="INFONAVIT" v={g.infonavit} /><Row k="SAR" v={g.sar} /><Row k="Cesantía y vejez" v={g.cesantia_vejez} />
          <Row k="Impuesto sobre nómina" v={g.isn} />
          {(g.comision_asimilables ?? 0) > 0 && <><Row k="Comisión asimilables" v={g.comision_asimilables} /><Row k="IVA comisión" v={g.iva_comision} /></>}<Row k="Prov. aguinaldo" v={g.prestaciones_detalle?.aguinaldo ?? 0} /><Row k="Prov. prima vacacional" v={g.prestaciones_detalle?.prima_vacacional ?? 0} />
          {g.otras_cargas > 0 && <Row k="Otras cargas" v={g.otras_cargas} />}
          <Row k="Total cargas patronales" v={g.total} />
          <Row k="Costo real total" v={r.costo_real_total} b />
        </tbody></table>
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Carga laboral', num(r.carga_laboral ?? 0)], ['Carga / neto', num(r.pct_carga_sobre_neto ?? 0, 1) + '%'], ['Carga / costo', num(r.pct_carga_sobre_costo ?? 0, 1) + '%'], ['Relación costo/neto', num(r.relacion_costo_neto ?? 0)]].map(([k, v]) =>
          <div key={k} className="border-l-2 border-dune pl-3"><div className="lbl">{k}</div><div className="num text-lg">{v}</div></div>)}
      </div>
      {(r.warnings?.length ?? 0) > 0 && <ul className="mt-3 text-sm text-ember space-y-0.5">{r.warnings.map(w => <li key={w.codigo}><b className="font-mono text-xs">{w.codigo}</b> {w.mensaje}</li>)}</ul>}
    </div>
  );
}
