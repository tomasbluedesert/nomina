import { db } from '@/lib/db';
import { companyId } from '@/lib/actions';
import { revalidatePath } from 'next/cache';
export const dynamic = 'force-dynamic';
const TIPOS = [['departamento', 'Departamento'], ['propiedad', 'Propiedad / villa'], ['centro_costos', 'Centro de costos'], ['empresa', 'Empresa']] as const;

async function guardar(fd: FormData) { 'use server';
  const cid = await companyId(); const id = String(fd.get('id') || ''); const nombre = String(fd.get('nombre')).trim(); const tipo = String(fd.get('tipo'));
  if (!nombre) throw new Error('Nombre requerido');
  if (id) await db.costCenter.update({ where: { id }, data: { nombre, tipo } }); else await db.costCenter.create({ data: { companyId: cid, nombre, tipo } });
  revalidatePath('/centros-costos'); revalidatePath('/empleados');
}
async function eliminar(id: string) { 'use server';
  const n = await db.employee.count({ where: { OR: [{ costCenterId: id }, { departmentId: id }] } });
  if (n) throw new Error(`No se puede eliminar: ${n} trabajador(es) asignados. Reasígnalos primero.`);
  await db.costCenter.delete({ where: { id } }); revalidatePath('/centros-costos');
}

export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const cid = await companyId(); const { edit } = await searchParams;
  const ccs = await db.costCenter.findMany({ where: { companyId: cid }, orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }], include: { _count: { select: { employees: true, empleadosDepto: true } } } });
  const e = ccs.find(c => c.id === edit);
  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      <div className="card"><table className="ledger w-full"><thead><tr><th className="pl-3">Nombre</th><th>Tipo</th><th className="r">Trabajadores</th><th></th></tr></thead><tbody>
        {ccs.map(c => <tr key={c.id}><td className="pl-3">{c.nombre}</td><td className="text-xs">{TIPOS.find(t => t[0] === c.tipo)?.[1] ?? c.tipo}</td><td className="r">{c._count.employees + c._count.empleadosDepto}</td>
          <td className="text-xs space-x-2"><a href={`/centros-costos?edit=${c.id}`} className="text-cobalt">Editar</a>{c._count.employees + c._count.empleadosDepto === 0 && <form action={eliminar.bind(null, c.id)} className="inline"><button className="text-ember">Eliminar</button></form>}</td></tr>)}
        {!ccs.length && <tr><td colSpan={4} className="p-6 text-center text-ink2">Sin centros de costos. Crea departamentos, propiedades o centros con el formulario; también se crean al importar empleados por Excel.</td></tr>}
      </tbody></table></div>
      <form action={guardar} className="card p-4 space-y-2 h-fit">
        <h2 className="font-semibold">{e ? `Editar ${e.nombre}` : 'Nuevo centro de costos'}</h2>
        <input type="hidden" name="id" defaultValue={e?.id ?? ''} />
        <label><span className="lbl">Nombre</span><input name="nombre" className="inp" required defaultValue={e?.nombre ?? ''} placeholder="Villa Azul, Mantenimiento, Administración…" /></label>
        <label><span className="lbl">Tipo</span><select name="tipo" className="inp" defaultValue={e?.tipo ?? 'departamento'}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <div className="flex gap-2 pt-1"><button className="btn">Guardar</button>{e && <a href="/centros-costos" className="btn-ghost">Cancelar</a>}</div>
        <p className="text-xs text-ink2 pt-2">El tipo se usa para agrupar en Presupuesto (empresa / departamento / propiedad / centro de costos).</p>
      </form>
    </div>
  );
}
