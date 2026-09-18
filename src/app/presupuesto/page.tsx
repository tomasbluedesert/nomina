import { db } from '@/lib/db';
import { companyId } from '@/lib/actions';
import { paramsVigentes } from '@/lib/params';
import { calcularCostoReal, type EmpleadoInput, type Periodo, type ResultadoTrabajador } from '@engine';
import { num, rangoPeriodo } from '@/lib/format';
import { revalidatePath } from 'next/cache';
export const dynamic = 'force-dynamic';

async function guardarPresupuesto(fd: FormData) { 'use server';
  const cid = await companyId();
  await db.scenario.create({ data: { companyId: cid, nombre: String(fd.get('nombre') || 'Presupuesto'), tipo: 'presupuesto', presupuestoObjetivo: Number(fd.get('objetivo')) } });
  revalidatePath('/presupuesto'); revalidatePath('/');
}
async function agregarLinea(fd: FormData) { 'use server';
  const cid = await companyId();
  let sc = await db.scenario.findFirst({ where: { companyId: cid, tipo: 'propuesto' }, orderBy: { createdAt: 'desc' } });
  if (!sc) sc = await db.scenario.create({ data: { companyId: cid, nombre: 'Propuesto', tipo: 'propuesto' } });
  await db.scenarioLine.create({ data: { scenarioId: sc.id, accion: fd.get('accion') as 'incremento' | 'alta' | 'baja', employeeId: String(fd.get('employeeId') || '') || null, nombre: String(fd.get('nombre') || '') || null, netoPactado: Number(fd.get('neto') || 0), sueldoDiario: Number(fd.get('sd') || 0) } });
  revalidatePath('/presupuesto');
}

export default async function Presupuesto({ searchParams }: { searchParams: Promise<{ por?: string }> }) {
  const cid = await companyId(); const { por = 'puesto' } = await searchParams;
  const hoy = new Date(); const per: Periodo = { tipo: 'mensual', ...rangoPeriodo('mensual', hoy.getFullYear(), hoy.getMonth() + 1) };
  let params; try { params = (await paramsVigentes(new Date(per.fecha_fin))).params; } catch (e) { return <div className="card p-4 text-ember">{(e as Error).message}</div>; }
  const emps = await db.employee.findMany({ where: { companyId: cid, estatus: 'activo' }, include: { costCenter: true, department: true } });
  const prop = await db.scenario.findFirst({ where: { companyId: cid, tipo: 'propuesto' }, orderBy: { createdAt: 'desc' }, include: { lines: true } });
  const pres = await db.scenario.findFirst({ where: { companyId: cid, tipo: 'presupuesto' }, orderBy: { createdAt: 'desc' } });
  // Todo se normaliza a base mensual (30 días) para comparar plantilla completa
  type Esq = 'fiscal' | 'mixto' | 'asimilables';
  // Base mensual: fiscal SD×30 · mixto neto mensual (×2 si quincenal) · asimilables SD libre × 30 (supuesto de mes completo trabajado)
  const calc = (esquema: Esq, sd: number, neto: number, fi: string) => {
    try { return calcularCostoReal({ esquema, sueldo_diario_fiscal: sd, neto_pactado: esquema === 'mixto' ? neto : 0, tipo_calculo: 'mensual_fijo', fecha_ingreso: fi }, per, params!); }
    catch { return null; }
  };
  const factorMes = (e: typeof emps[number]) => e.periodicidad === 'quincenal' ? 2 : 1;
  const actual = emps.map(e => ({ e, r: calc(e.esquema as Esq, Number(e.sueldoDiarioFiscal), Number(e.netoPactado) * factorMes(e), e.fechaIngreso.toISOString().slice(0, 10)) })).filter(x => x.r) as { e: typeof emps[number]; r: ResultadoTrabajador }[];
  const omitidos = emps.length - actual.length;
  const propuesto = [...actual.map(({ e, r }) => { const l = prop?.lines.find(x => x.employeeId === e.id); if (!l) return r; if (l.accion === 'baja') return null; return calc(e.esquema as Esq, Number(l.sueldoDiario) || Number(e.sueldoDiarioFiscal), (Number(l.netoPactado) || Number(e.netoPactado)) * factorMes(e), e.fechaIngreso.toISOString().slice(0, 10)); }).filter(Boolean) as ResultadoTrabajador[],
    ...(prop?.lines.filter(l => l.accion === 'alta').map(l => calc(Number(l.netoPactado) > 0 && Number(l.sueldoDiario) > 0 ? 'mixto' : Number(l.sueldoDiario) > 0 ? 'fiscal' : 'mixto', Number(l.sueldoDiario), Number(l.netoPactado), per.fecha_inicio)).filter(Boolean) as ResultadoTrabajador[] ?? [])];
  const agg = (rs: ResultadoTrabajador[]) => ({ n: rs.length, neto: rs.reduce((a, r) => a + r.neto_total, 0), bruto: rs.reduce((a, r) => a + r.nomina.bruto_fiscal, 0), asim: rs.reduce((a, r) => a + r.asimilables.bruto, 0), cargas: rs.reduce((a, r) => a + r.cargas.total, 0), costo: rs.reduce((a, r) => a + r.costo_real_total, 0) });
  const A = agg(actual.map(x => x.r)), Pp = agg(propuesto);
  const grupos = new Map<string, ResultadoTrabajador[]>();
  for (const { e, r } of actual) { const k = por === 'puesto' ? e.puesto : por === 'contratacion' ? (e.tipoContratacion ?? 'Sin tipo') : por === 'departamento' ? (e.department?.nombre ?? 'Sin departamento') : por === 'empresa' ? 'Empresa' : (e.costCenter?.nombre ?? 'Sin centro'); grupos.set(k, [...(grupos.get(k) ?? []), r]); }
  const objetivo = Number(pres?.presupuestoObjetivo ?? 0);
  const cmp: [string, number, number][] = [['Neto trabajadores', A.neto, Pp.neto], ['Bruto fiscal', A.bruto, Pp.bruto], ['Asimilables', A.asim, Pp.asim], ['Cargas patronales', A.cargas, Pp.cargas], ['Costo mensual', A.costo, Pp.costo], ['Costo anual', A.costo * 12, Pp.costo * 12]];
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-5 gap-3">
        {[['Trabajadores', A.n, 0], ['Neto mensual', A.neto], ['Bruto fiscal', A.bruto], ['Asimilables', A.asim], ['Cargas patronales', A.cargas], ['Costo mensual', A.costo], ['Costo anual', A.costo * 12], ['Promedio por trabajador', A.n ? A.costo / A.n : 0], ['Relación costo/neto', A.neto ? A.costo / A.neto : 0], ['Presupuesto mensual', objetivo]].map(([k, v, d]) =>
          <div key={k as string} className="card p-3"><div className="lbl">{k}</div><div className="num text-lg">{num(v as number, d === 0 ? 0 : 2)}</div></div>)}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4"><div className="flex items-baseline justify-between mb-2"><h2 className="font-semibold">Escenarios</h2><span className="lbl">base mensual · parámetros {params.ejercicio}{omitidos > 0 ? ` · ${omitidos} omitido(s) por datos incompletos` : ''}</span></div>
          <table className="ledger w-full"><thead><tr><th>Indicador</th><th className="r">Actual</th><th className="r">Propuesto</th><th className="r">Diferencia</th>{objetivo > 0 && <th className="r">vs presupuesto</th>}</tr></thead><tbody>
            {cmp.map(([k, a, b]) => <tr key={k}><td>{k}</td><td className="r">{num(a)}</td><td className="r">{num(b)}</td><td className={`r ${b - a > 0 ? 'text-ember' : b - a < 0 ? 'text-sage' : ''}`}>{num(b - a)}</td>{objetivo > 0 && <td className="r">{k === 'Costo mensual' ? num(b - objetivo) : k === 'Costo anual' ? num(b - objetivo * 12) : ''}</td>}</tr>)}</tbody></table>
          {prop?.lines.length ? <ul className="mt-3 text-xs text-ink2 space-y-0.5">{prop.lines.map(l => <li key={l.id}>{l.accion} · {l.nombre ?? emps.find(e => e.id === l.employeeId)?.nombre} · neto {num(Number(l.netoPactado))}</li>)}</ul> : <p className="mt-3 text-xs text-ink2">Sin cambios propuestos: agrega incrementos, altas o bajas.</p>}
        </div>
        <div className="space-y-4">
          <form action={agregarLinea} className="card p-4 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
            <label className="md:col-span-5 font-semibold text-sm">Cambio al escenario propuesto</label>
            <label><span className="lbl">Acción</span><select name="accion" className="inp"><option value="incremento">Incremento</option><option value="alta">Alta</option><option value="baja">Baja</option></select></label>
            <label><span className="lbl">Trabajador</span><select name="employeeId" className="inp"><option value="">(nuevo)</option>{emps.map(e => <option key={e.id} value={e.id}>{e.numeroEmpleado} {e.nombre}</option>)}</select></label>
            <label><span className="lbl">Nombre (alta)</span><input name="nombre" className="inp" /></label>
            <label><span className="lbl">Neto mensual</span><input name="neto" type="number" step="0.01" className="inp num" /></label>
            <label><span className="lbl">SD fiscal</span><input name="sd" type="number" step="0.01" className="inp num" /></label>
            <button className="btn md:col-span-5 w-fit">Agregar al propuesto</button>
          </form>
          <form action={guardarPresupuesto} className="card p-4 flex items-end gap-2">
            <label className="flex-1"><span className="lbl">Nombre</span><input name="nombre" className="inp" defaultValue={`Presupuesto ${hoy.getFullYear()}`} /></label>
            <label className="flex-1"><span className="lbl">Presupuesto mensual objetivo</span><input name="objetivo" type="number" step="0.01" className="inp num" required /></label>
            <button className="btn">Guardar presupuesto</button>
          </form>
        </div>
      </div>
      <div className="card p-4"><div className="flex items-center gap-3 mb-2"><h2 className="font-semibold">Plantilla agrupada</h2>
        <div className="flex gap-1 text-xs">{[['puesto', 'Puesto'], ['empresa', 'Empresa'], ['departamento', 'Departamento'], ['centro', 'Centro de costos / propiedad'], ['contratacion', 'Tipo de contratación']].map(([k, l]) => <a key={k} href={`/presupuesto?por=${k}`} className={`px-2 py-0.5 rounded border ${por === k ? 'border-cobalt text-cobalt' : 'border-line'}`}>{l}</a>)}</div></div>
        <table className="ledger w-full"><thead><tr><th>Grupo</th><th className="r">Trab.</th><th className="r">Neto</th><th className="r">Bruto fiscal</th><th className="r">Asimilables</th><th className="r">Cargas</th><th className="r">Costo mensual</th><th className="r">Costo anual</th><th className="r">Costo/neto</th></tr></thead><tbody>
          {[...grupos.entries()].sort((a, b) => agg(b[1]).costo - agg(a[1]).costo).map(([k, rs]) => { const g = agg(rs); return <tr key={k}><td>{k}</td><td className="r">{g.n}</td><td className="r">{num(g.neto)}</td><td className="r">{num(g.bruto)}</td><td className="r">{num(g.asim)}</td><td className="r">{num(g.cargas)}</td><td className="r">{num(g.costo)}</td><td className="r">{num(g.costo * 12)}</td><td className="r">{num(g.neto ? g.costo / g.neto : 0)}</td></tr>; })}
          {!actual.length && <tr><td colSpan={9} className="p-4 text-center text-ink2">Sin trabajadores activos.</td></tr>}
        </tbody></table></div>
    </div>
  );
}
