import { db } from '@/lib/db';
import { guardarEmpleado, companyId } from '@/lib/actions';
import { num } from '@/lib/format';
import { EsquemaFields } from '@/components/EsquemaFields';
export const dynamic = 'force-dynamic';
const _x=0;
export default async function Empleados({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const cid = await companyId(); const { edit } = await searchParams;
  const [emps, ccs, puestos] = await Promise.all([db.employee.findMany({ where: { companyId: cid }, orderBy: { numeroEmpleado: 'asc' }, include: { costCenter: true, department: true } }), db.costCenter.findMany({ where: { companyId: cid }, orderBy: { nombre: 'asc' } }), db.puesto.findMany({ where: { companyId: cid }, orderBy: { nombre: 'asc' } })]);
  const deptos = ccs.filter(c => c.tipo === 'departamento'), centros = ccs.filter(c => c.tipo !== 'departamento');
  const e = edit ? emps.find(x => x.id === edit) : undefined;
  const tabla = <><table className="ledger w-full"><thead><tr><th className="pl-3">#</th><th>Nombre</th><th>Puesto</th><th>Depto</th><th>Centro</th><th>RFC</th><th>Esquema</th><th className="r">SD fiscal</th><th className="r">Neto pactado</th><th>Periodicidad</th><th>Cálculo</th><th>Estatus</th><th></th></tr></thead><tbody>
        {emps.map(x => <tr key={x.id} className={x.estatus === 'baja' ? 'opacity-50' : ''}><td className="pl-3 num">{x.numeroEmpleado}</td><td>{x.nombre}</td><td>{x.puesto}</td><td className="text-xs">{x.department?.nombre ?? ''}</td><td className="text-xs">{x.costCenter?.nombre ?? ''}</td><td className="num text-xs">{x.rfc}</td><td className="text-xs">{x.esquema}</td><td className="r">{num(Number(x.sueldoDiarioFiscal))}{x.esquema === 'asimilables' ? ' libre' : ''}</td><td className="r">{x.esquema !== 'mixto' ? '—' : num(Number(x.netoPactado))}</td><td>{x.periodicidad}</td><td className="text-xs">{x.tipoCalculo}</td><td>{x.estatus}</td><td className="text-xs space-x-2"><a href={`/empleados?edit=${x.id}`} className="text-cobalt">Editar</a><a href={`/historial/trabajador/${x.id}`} className="text-cobalt">Historial</a></td></tr>)}
        {!emps.length && <tr><td colSpan={13} className="p-6 text-center text-ink2">Sin trabajadores. Registra el primero con el formulario.</td></tr>}
      </tbody></table></>;
  const v = (k: string, d = '') => (e ? String((e as Record<string, unknown>)[k] ?? d) : d);
  return (
    <div className="space-y-4">
      <details className="card" open={!!e}>
        <summary className="cursor-pointer px-4 py-2.5 font-semibold text-sm select-none flex items-center gap-2">{e ? `Editar ${e.numeroEmpleado} · ${e.nombre}` : "Nuevo trabajador"}<span className="lbl ml-auto">clic para abrir/cerrar</span></summary>
        <div className="p-4 pt-1">
      <form action={guardarEmpleado} className="grid md:grid-cols-3 gap-x-6 gap-y-2 items-start">
        <div className="flex justify-end"><a href="/empleados/importar" className="text-xs text-cobalt">Carga masiva (Excel)</a></div>
        <input type="hidden" name="id" defaultValue={e?.id ?? ''} />
        <div className="grid grid-cols-2 gap-2">
          <label><span className="lbl">No. empleado</span><input name="numeroEmpleado" className="inp" required defaultValue={v('numeroEmpleado')} /></label>
          <label><span className="lbl">Fecha ingreso</span><input name="fechaIngreso" type="date" className="inp" required defaultValue={e ? e.fechaIngreso.toISOString().slice(0, 10) : ''} /></label>
        </div>
        <label><span className="lbl">Nombre</span><input name="nombre" className="inp" required defaultValue={v('nombre')} /></label>
        <label><span className="lbl">Puesto</span><input name="puesto" className="inp" required list="puestos" defaultValue={v('puesto')} placeholder="Elige o escribe uno nuevo" /><datalist id="puestos">{puestos.map(x => <option key={x.id} value={x.nombre} />)}</datalist></label>
        <label><span className="lbl">Departamento</span><select name="departmentId" className="inp" defaultValue={v('departmentId')}><option value="">—</option>{deptos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
        <div className="grid grid-cols-3 gap-2">
          <label><span className="lbl">RFC</span><input name="rfc" className="inp" required defaultValue={v('rfc')} /></label>
          <label><span className="lbl">CURP</span><input name="curp" className="inp" defaultValue={v('curp')} /></label>
          <label><span className="lbl">NSS</span><input name="nss" className="inp" defaultValue={v('nss')} /></label>
        </div>
        <EsquemaFields esquema={v('esquema', 'mixto')} sd={v('sueldoDiarioFiscal')} neto={v('netoPactado')} />
        <div className="grid grid-cols-2 gap-2">
          <label><span className="lbl">Periodicidad</span><select name="periodicidad" className="inp" defaultValue={v('periodicidad', 'quincenal')}><option value="quincenal">Quincenal</option><option value="mensual">Mensual</option><option value="personalizado">Personalizado</option></select></label>
          <label><span className="lbl">Tipo de cálculo</span><select name="tipoCalculo" className="inp" defaultValue={v('tipoCalculo', 'quincenal_fijo')}><option value="quincenal_fijo">Quincenal fijo (15 d)</option><option value="mensual_fijo">Mensual fijo (30 d)</option><option value="diario_x_dias">Diario × días reales</option></select></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label><span className="lbl">Centro de costos <a href="/centros-costos" className="text-cobalt normal-case tracking-normal">(administrar)</a></span><select name="costCenterId" className="inp" defaultValue={v('costCenterId')}><option value="">—</option>{centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
          <label><span className="lbl">Estatus</span><select name="estatus" className="inp" defaultValue={v('estatus', 'activo')}><option value="activo">Activo</option><option value="baja">Baja</option></select></label>
        </div>
        <label><span className="lbl">Tipo de contratación</span><input name="tipoContratacion" className="inp" defaultValue={v('tipoContratacion')} /></label>
        <label><span className="lbl">SDI registrado ante IMSS (opcional)</span><input name="sdiRegistrado" type="number" step="0.01" min="0" className="inp num" defaultValue={v('sdiRegistrado', '') === 'null' ? '' : v('sdiRegistrado', '')} placeholder="Vacío = se calcula con factor de integración" /></label>
        <div className="pt-1"><span className="lbl">Descuentos fijos por periodo (nómina fiscal)</span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[['descInfonavit', 'Infonavit'], ['descFonacot', 'Fonacot'], ['descPrestamo', 'Préstamo'], ['descPension', 'Pensión alimenticia']].map(([k, l]) => <label key={k}><span className="text-xs text-ink2">{l}</span><input name={k} type="number" step="0.01" min="0" className="inp num" defaultValue={v(k, '0') === '0' ? '' : v(k)} placeholder="0.00" /></label>)}
          </div><p className="text-xs text-ink2 mt-1">Se restan del neto del trabajador; los asimilables no los compensan.</p></div>
        <div className="flex gap-2 pt-1 md:col-span-3"><button className="btn">Guardar trabajador</button>{e && <a href="/empleados" className="btn-ghost">Cancelar</a>}</div>
      </form>
        </div>
      </details>
      <div className="card overflow-x-auto">{tabla}</div>
    </div>
  );
}
