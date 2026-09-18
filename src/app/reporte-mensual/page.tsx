import { db } from '@/lib/db';
import { companyId } from '@/lib/actions';
import { ReporteMensual } from './ui';
import type { ResultadoTrabajador } from '@engine';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ anio?: string; mes?: string; por?: string }> }) {
  const cid = await companyId(); const sp = await searchParams; const hoy = new Date();
  const anio = Number(sp.anio ?? hoy.getFullYear()), mes = Number(sp.mes ?? hoy.getMonth() + 1), por = sp.por === 'centro' ? 'centro' : 'departamento';
  const ini = new Date(Date.UTC(anio, mes - 1, 1)), fin = new Date(Date.UTC(anio, mes, 0));
  const periods = await db.payrollPeriod.findMany({ where: { companyId: cid, fechaInicio: { gte: ini }, fechaFin: { lte: fin } }, orderBy: { fechaInicio: 'asc' } });
  const calcs = await db.payrollCalculation.findMany({ where: { periodId: { in: periods.map(p => p.id) } }, orderBy: { calculatedAt: 'desc' }, distinct: ['periodId', 'employeeId'], include: { employee: { include: { department: true, costCenter: true } }, period: true } });
  const filas = calcs.map(c => ({ periodo: `${c.period.fechaInicio.toISOString().slice(5, 10)}→${c.period.fechaFin.toISOString().slice(5, 10)}`, numero: c.employee.numeroEmpleado, nombre: c.employee.nombre, esquema: c.employee.esquema,
    grupo: por === 'centro' ? (c.employee.costCenter?.nombre ?? 'Sin centro de costos') : (c.employee.department?.nombre ?? 'Sin departamento'), r: c.result as unknown as ResultadoTrabajador }));
  return <ReporteMensual anio={anio} mes={mes} por={por} periodos={periods.map(p => `${p.fechaInicio.toISOString().slice(0, 10)} → ${p.fechaFin.toISOString().slice(0, 10)} (${p.tipo})`)} filas={filas} />;
}
