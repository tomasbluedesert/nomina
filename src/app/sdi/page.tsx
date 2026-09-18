import { db } from '@/lib/db';
import { companyId } from '@/lib/actions';
import { paramsVigentes } from '@/lib/params';
import { aniosAntiguedad, diasVacaciones, factorIntegracion } from '@engine';
import { ReporteSDI } from './ui';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const cid = await companyId(); const { fecha = new Date().toISOString().slice(0, 10) } = await searchParams;
  let params, etiqueta = ''; try { const r = await paramsVigentes(new Date(fecha)); params = r.params; etiqueta = `${r.row.ejercicio} v${r.row.version}`; } catch (e) { return <div className="card p-4 text-ember">{(e as Error).message}</div>; }
  const emps = await db.employee.findMany({ where: { companyId: cid, estatus: 'activo', esquema: { not: 'asimilables' } }, orderBy: { numeroEmpleado: 'asc' }, include: { department: true } });
  const tope = Math.round(params.tope_cotizacion_umas * params.uma_diaria * 100) / 100;
  const filas = emps.map(e => {
    const fi = e.fechaIngreso.toISOString().slice(0, 10); const anios = aniosAntiguedad(fi, fecha); const sd = Number(e.sueldoDiarioFiscal);
    const vac = diasVacaciones(anios, params!), factor = factorIntegracion(anios, params!); const sdi = Math.round(sd * factor * 100) / 100;
    const reg = e.sdiRegistrado ? Number(e.sdiRegistrado) : null; const usado = reg ?? sdi;
    return { numero: e.numeroEmpleado, nombre: e.nombre, depto: e.department?.nombre ?? '', esquema: e.esquema, ingreso: fi, anios, vac, factor: Math.round(factor * 10000) / 10000, sd, sdi, registrado: reg, usado, dif: reg !== null ? Math.round((reg - sdi) * 100) / 100 : null, sbc: Math.min(usado, tope), topado: usado > tope, bajoSM: sd < params!.salario_minimo_general };
  });
  return <ReporteSDI filas={filas} fecha={fecha} etiqueta={etiqueta} aguinaldo={params.lft.dias_aguinaldo} prima={params.lft.prima_vacacional} uma={params.uma_diaria} tope={tope} sm={params.salario_minimo_general} />;
}
