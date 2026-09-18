import { Pool } from 'pg';
/** Conexión de solo lectura al proyecto Supabase de asistencias (ASISTENCIAS_DATABASE_URL). */
const g = globalThis as unknown as { asisPool?: Pool };
export function asistencias(): Pool {
  const url = process.env.ASISTENCIAS_DATABASE_URL;
  if (!url) throw new Error('ASISTENCIAS_NO_CONFIGURADO: agrega ASISTENCIAS_DATABASE_URL en .env');
  if (!g.asisPool) g.asisPool = new Pool({ connectionString: url, max: 3, ssl: { rejectUnauthorized: false } });
  return g.asisPool;
}

export interface EmpleadoAsis {
  id: string; numero: string; nombre: string; rfc: string; curp: string | null; nss: string | null; puesto: string; depto: string | null; centro: string | null;
  fechaIngreso: string | null; claseNomina: string | null; tipoContrato: string | null; tipoColaborador: string | null; activo: boolean; estatus: string | null;
  salarioDiario: number | null; salarioMensual: number | null; salarioIntegrado: number | null;
  infonavit: number | null; fonacot: number | null; pensiones: number | null;
}
const n = (v: unknown) => { const x = Number(v); return v === '' || v == null || isNaN(x) ? null : x; };
const s = (v: unknown) => { const t = String(v ?? '').trim(); return t || null; };

export async function leerEmpleados(): Promise<EmpleadoAsis[]> {
  const { rows } = await asistencias().query<{ id: string; datos: Record<string, unknown>; activo: boolean }>('select id, datos, activo from empleados order by datos->>\'numero\'');
  return rows.map(r => { const d = r.datos; return {
    id: r.id, numero: s(d.numero) ?? r.id, nombre: [d.nombres, d.apPaterno, d.apMaterno].map(s).filter(Boolean).join(' '),
    rfc: (s(d.rfc) ?? '').toUpperCase(), curp: s(d.curp)?.toUpperCase() ?? null, nss: s(d.imss), puesto: s(d.puesto) ?? 'Sin puesto', depto: s(d.depto), centro: s(d.centroTrabajo),
    fechaIngreso: s(d.fechaAntiguedad) ?? s(d.fechaIngreso), claseNomina: s(d.claseNomina), tipoContrato: s(d.tipoContrato), tipoColaborador: s(d.tipoColaborador),
    activo: r.activo && String(d.estatus ?? 'Activo').toLowerCase() !== 'baja', estatus: s(d.estatus),
    salarioDiario: n(d.salarioDiario), salarioMensual: n(d.salarioMensual), salarioIntegrado: n(d.salarioIntegrado), infonavit: n(d.infonavit), fonacot: n(d.fonacot), pensiones: n(d.pensiones) }; });
}
export async function leerCatalogos(): Promise<Record<string, string[]>> {
  const { rows } = await asistencias().query<{ tipo: string; valores: string[] }>('select tipo, valores from catalogos');
  return Object.fromEntries(rows.map(r => [r.tipo, Array.isArray(r.valores) ? r.valores : []]));
}
/** Días marcados del periodo (p.ej. 2026-08-Q1) por emp_id de asistencias; {} si no hay registro (= todo asistencia). */
export async function leerAsistencia(periodo: string): Promise<{ cerrado: boolean; dias: Record<string, Record<string, string>> }> {
  const [a, c] = await Promise.all([
    asistencias().query<{ emp_id: string; dias: Record<string, string> }>('select emp_id, dias from asistencia where periodo = $1', [periodo]),
    asistencias().query('select 1 from asis_cerradas where periodo = $1 limit 1', [periodo]),
  ]);
  return { cerrado: c.rowCount! > 0, dias: Object.fromEntries(a.rows.map(r => [r.emp_id, r.dias ?? {}])) };
}
export async function leerIncidencias(desde: string, hasta: string) {
  const { rows } = await asistencias().query<{ tipo: string; datos: Record<string, unknown> }>(
    `select tipo, datos from incidencias where estatus = 'autorizada' and (
       (tipo = 'Baja' and datos->>'ultimoDia' between $1 and $2) or
       (tipo = 'Vacaciones' and datos->>'del' <= $2 and datos->>'al' >= $1))`, [desde, hasta]);
  return rows.map(r => ({ tipo: r.tipo, empId: String(r.datos.empId), del: s(r.datos.del), al: s(r.datos.al), dias: n(r.datos.dias), ultimoDia: s(r.datos.ultimoDia) }));
}
export async function leerFestivos(desde: string, hasta: string): Promise<string[]> {
  const { rows } = await asistencias().query<{ fecha: string }>('select to_char(fecha, \'YYYY-MM-DD\') fecha from festivos where fecha between $1 and $2', [desde, hasta]);
  return rows.map(r => r.fecha);
}
export async function probarConexion() {
  const r = await asistencias().query<{ e: string; a: string; c: string }>('select (select count(*) from empleados) e, (select count(*) from asistencia) a, (select count(*) from asis_cerradas) c');
  return r.rows[0];
}
