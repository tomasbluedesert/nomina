import { db } from '@/lib/db';
import { num } from '@/lib/format';
import type { ResultadoTrabajador } from '@engine';
export const dynamic = 'force-dynamic';

type Res = { n: number; neto: number; bruto: number; asim: number; isr: number; imssO: number; imssP: number; infonavit: number; isn: number; cargas: number; costo: number };
async function resumenPeriodos(ids: string[]): Promise<Res> {
  const z: Res = { n: 0, neto: 0, bruto: 0, asim: 0, isr: 0, imssO: 0, imssP: 0, infonavit: 0, isn: 0, cargas: 0, costo: 0 };
  for (const id of ids) {
    const calcs = await db.payrollCalculation.findMany({ where: { periodId: id }, orderBy: { calculatedAt: 'desc' }, distinct: ['employeeId'] });
    const rs = calcs.map(c => c.result as unknown as ResultadoTrabajador);
    const s = (f: (r: ResultadoTrabajador) => number) => rs.reduce((a, r) => a + (f(r) || 0), 0);
    z.n = Math.max(z.n, rs.length); z.neto += s(r => r.neto_total); z.bruto += s(r => r.nomina.bruto_fiscal); z.asim += s(r => r.asimilables.bruto);
    z.isr += s(r => r.nomina.isr_nomina + r.asimilables.isr); z.imssO += s(r => r.nomina.imss_obrero); z.imssP += s(r => r.cargas.imss_patron);
    z.infonavit += s(r => r.cargas.infonavit); z.isn += s(r => r.cargas.isn); z.cargas += s(r => r.cargas.total); z.costo += s(r => r.costo_real_total);
  }
  return z;
}
function idsDeVista(periods: { id: string; tipo: string; fechaInicio: Date; fechaFin: Date }[], vista: string, anio: number, mes: number) {
  const enMes = periods.filter(p => p.fechaInicio.getUTCFullYear() === anio && p.fechaInicio.getUTCMonth() + 1 === mes);
  if (vista === 'q1') return enMes.filter(p => p.tipo === 'quincenal' && p.fechaInicio.getUTCDate() <= 15).map(p => p.id);
  if (vista === 'q2') return enMes.filter(p => p.tipo === 'quincenal' && p.fechaInicio.getUTCDate() > 15).map(p => p.id);
  const mensual = enMes.filter(p => p.tipo === 'mensual');
  return (mensual.length ? mensual : enMes).map(p => p.id);
}
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ vista?: string; mes?: string; anio?: string }> }) {
  const sp = await searchParams;
  const periods = await db.payrollPeriod.findMany({ orderBy: { fechaFin: 'desc' }, include: { paramSet: true } });
  if (!periods.length) return <Empty />;
  const ultimo = periods[0];
  const vista = sp.vista ?? (ultimo.tipo === 'mensual' ? 'mes' : ultimo.fechaInicio.getUTCDate() <= 15 ? 'q1' : 'q2');
  const anio = Number(sp.anio ?? ultimo.fechaInicio.getUTCFullYear());
  const mes = Number(sp.mes ?? ultimo.fechaInicio.getUTCMonth() + 1);
  const ids = idsDeVista(periods, vista, anio, mes);
  const cur = await resumenPeriodos(ids);
  // periodo anterior equivalente: misma vista del mes anterior (q2 compara con q1 del mismo mes)
  const [pAnio, pMes] = vista === 'q2' ? [anio, mes] : mes === 1 ? [anio - 1, 12] : [anio, mes - 1];
  const prevIds = idsDeVista(periods, vista === 'q2' ? 'q1' : vista, pAnio, pMes);
  const prev = prevIds.length ? await resumenPeriodos(prevIds) : null;

  const presupuestoMensual = Number((await db.scenario.findFirst({ where: { tipo: 'presupuesto' }, orderBy: { createdAt: 'desc' } }))?.presupuestoObjetivo ?? 0);
  const objetivo = presupuestoMensual * (vista === 'mes' ? 1 : 0.5);
  const settings = Object.fromEntries((await db.appSetting.findMany()).map(s => [s.key, Number(s.value)]));
  const factor = vista === 'mes' ? 12 : 24;
  const rel = cur.neto ? cur.costo / cur.neto : 0;
  const varPrev = prev?.costo ? (cur.costo - prev.costo) / prev.costo * 100 : null;
  const usoPres = objetivo ? cur.costo / objetivo * 100 : null;
  const disponible = objetivo - cur.costo;
  const sem = usoPres === null ? 'bg-line' : usoPres >= (settings.semaforo_rojo_pct ?? 100) ? 'bg-ember' : usoPres >= (settings.semaforo_amarillo_pct ?? 90) ? 'bg-amber' : 'bg-sage';
  const etiquetaVista = vista === 'mes' ? `Mensual · ${MESES[mes - 1]} ${anio}` : `${vista === 'q1' ? '1ª' : '2ª'} quincena · ${MESES[mes - 1]} ${anio}`;
  const anios = [...new Set(periods.map(p => p.fechaInicio.getUTCFullYear()))].sort();
  const K = ({ k, v, sub }: { k: string; v: string; sub?: string }) => <div className="card p-4"><div className="lbl">{k}</div><div className="num text-2xl mt-1">{v}</div>{sub && <div className="text-xs text-ink2 mt-1">{sub}</div>}</div>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="text-xl font-semibold mr-auto">Costo Real de Nómina</h1>
        <form className="flex items-end gap-2">
          <label><span className="lbl">Vista</span><select name="vista" className="inp" defaultValue={vista}><option value="q1">1ª quincena</option><option value="q2">2ª quincena</option><option value="mes">Mensual</option></select></label>
          <label><span className="lbl">Mes</span><select name="mes" className="inp" defaultValue={mes}>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
          <label><span className="lbl">Año</span><select name="anio" className="inp" defaultValue={anio}>{anios.map(a => <option key={String(a)} value={String(a)}>{String(a)}</option>)}</select></label>
          <button className="btn-ghost">Ver</button>
        </form>
      </div>
      {!ids.length ? <div className="card p-6 text-center text-ink2">No hay nómina calculada o importada para <b>{etiquetaVista}</b>. Calcula en <a href="/nomina" className="text-cobalt">Nómina</a> o carga en <a href="/historial/importar" className="text-cobalt">Importar histórica</a>.</div> : <>
      <div className="lbl">{etiquetaVista} · {ids.length} periodo(s) · {cur.n} trabajadores{vista === 'mes' && ids.length === 2 ? ' · suma de 2 quincenas' : ''}</div>
      <div className="grid md:grid-cols-4 gap-3">
        <K k="Costo real" v={num(cur.costo)} sub={varPrev !== null ? `${varPrev >= 0 ? '+' : ''}${num(varPrev, 1)}% vs ${vista === 'q2' ? '1ª quincena' : 'periodo anterior'}` : 'Sin comparativo'} />
        <K k="Neto total pagado" v={num(cur.neto)} sub={`Relación costo/neto ${num(rel)}`} />
        <K k="Costo anual proyectado" v={num(cur.costo * factor)} sub={`× ${factor} periodos`} />
        <K k="Costo promedio por trabajador" v={num(cur.n ? cur.costo / cur.n : 0)} />
      </div>
      <div className="grid md:grid-cols-6 gap-3">
        {[['Bruto fiscal', cur.bruto], ['Asimilables', cur.asim], ['ISR retenido', cur.isr], ['IMSS trabajador', cur.imssO], ['IMSS patronal', cur.imssP], ['INFONAVIT', cur.infonavit], ['ISN', cur.isn], ['Cargas patronales', cur.cargas]].map(([k, v]) =>
          <div key={k as string} className="border-l-2 border-dune pl-3"><div className="lbl">{k}</div><div className="num">{num(v as number)}</div></div>)}
      </div>
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap"><span className={`w-3 h-3 rounded-full ${sem}`} /><h2 className="font-semibold">Presupuesto</h2>
          {objetivo > 0 ? <span className="text-sm text-ink2 ml-auto">Objetivo {vista === 'mes' ? 'mensual' : 'quincenal (½ del mensual)'} <b className="num">{num(objetivo)}</b> · ejercido <b className="num">{num(cur.costo)}</b> ({num(usoPres!, 1)}%) · {disponible >= 0 ? 'disponible' : 'excedido'} <b className={`num ${disponible < 0 ? 'text-ember' : ''}`}>{num(Math.abs(disponible))}</b></span>
            : <span className="text-sm text-ink2 ml-auto">Captura el presupuesto mensual en <a href="/presupuesto" className="text-cobalt">Presupuesto</a> para activar el semáforo</span>}</div>
        {objetivo > 0 && <div className="h-2 bg-line rounded mt-3 overflow-hidden"><div className={`h-full ${sem}`} style={{ width: `${Math.min(100, usoPres!)}%` }} /></div>}
      </div></>}
    </div>
  );
}
function Empty() {
  return <div className="card p-8 text-center"><h1 className="text-xl font-semibold">Aún no hay periodos calculados</h1>
    <p className="text-ink2 mt-2">Registra trabajadores en <a className="text-cobalt" href="/empleados">Empleados</a> y calcula la primera quincena o mes en <a className="text-cobalt" href="/nomina">Nómina</a>.</p></div>;
}
