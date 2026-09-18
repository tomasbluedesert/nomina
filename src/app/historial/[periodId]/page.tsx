import { db } from '@/lib/db';
import { ReportesNomina } from '@/components/ReportesNomina';
import type { ResultadoTrabajador } from '@engine';
export const dynamic = 'force-dynamic';
export default async function Periodo({ params }: { params: Promise<{ periodId: string }> }) {
  const { periodId } = await params;
  const p = await db.payrollPeriod.findUniqueOrThrow({ where: { id: periodId }, include: { paramSet: true } });
  const calcs = await db.payrollCalculation.findMany({ where: { periodId }, orderBy: { calculatedAt: 'desc' }, distinct: ['employeeId'], include: { employee: true } });
  const filas = calcs.map(c => ({ empleado: c.employee.numeroEmpleado, nombre: c.employee.nombre, resultado: c.result as unknown as ResultadoTrabajador })).sort((a, b) => a.empleado.localeCompare(b.empleado));
  const ini = p.fechaInicio.toISOString().slice(0, 10), fin = p.fechaFin.toISOString().slice(0, 10);
  return <div className="space-y-4">
    <div className="flex items-baseline justify-between flex-wrap gap-2"><h1 className="text-xl font-semibold">Nómina {ini} → {fin}</h1>
      <span className="lbl">{p.tipo} · parámetros {p.paramSet.ejercicio} v{p.paramSet.version} · hash {p.paramSet.hashSha256.slice(0, 12)} · {filas.length} trabajadores · <a href="/historial" className="text-cobalt">← Historial</a></span></div>
    <ReportesNomina filas={filas} periodo={`${ini}_${fin}`} />
    <div className="card p-3 text-xs text-ink2">Calculado por: {[...new Set(calcs.map(c => c.calculatedBy ?? 'sin sesión'))].join(', ')} · último cálculo {calcs[0]?.calculatedAt.toLocaleString('es-MX')}. Cada fila del reporte es el último cálculo guardado de ese trabajador en este periodo; los cálculos anteriores se conservan en la base.</div>
  </div>;
}
