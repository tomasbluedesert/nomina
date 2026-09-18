import { db } from './db';
import { leerAsistencia, leerEmpleados, leerIncidencias, leerFestivos } from './asistencias';

/** paga: cuenta como día pagado · trabaja: día efectivamente laborado (genera prima dominical si cae en domingo y pago extra si es festivo) */
export type CodigoCfg = { codigo: string; nombre: string; paga: boolean; trabaja?: boolean };
export const CODIGOS_DEFAULT: CodigoCfg[] = [
  { codigo: 'A', nombre: 'Asistencia', paga: true, trabaja: true }, { codigo: 'D', nombre: 'Descanso', paga: true }, { codigo: 'V', nombre: 'Vacaciones', paga: true },
  { codigo: 'DF', nombre: 'Día festivo', paga: true, trabaja: true }, { codigo: 'DT', nombre: 'Descanso trabajado', paga: true, trabaja: true }, { codigo: 'TXT', nombre: 'Tiempo por tiempo', paga: true, trabaja: true },
  { codigo: 'P', nombre: 'Permiso con goce', paga: true }, { codigo: 'PS', nombre: 'Permiso sin goce', paga: false }, { codigo: 'F', nombre: 'Falta', paga: false },
  { codigo: 'I', nombre: 'Incapacidad', paga: false }, { codigo: 'B', nombre: 'Baja', paga: false },
];
/** Regla para días sin marca en asistencias: 'no_paga' (default: solo se paga lo marcado) o 'paga' (sin marca = asistencia). */
export async function reglaSinMarca(companyId: string): Promise<'paga' | 'no_paga'> {
  const s = await db.appSetting.findUnique({ where: { companyId_key: { companyId, key: 'sin_marca' } } });
  return s?.value === 'paga' ? 'paga' : 'no_paga';
}
export async function codigosCfg(companyId: string): Promise<CodigoCfg[]> {
  const s = await db.appSetting.findUnique({ where: { companyId_key: { companyId, key: 'codigos_asistencia' } } });
  if (!s) return CODIGOS_DEFAULT;
  try { return JSON.parse(s.value) as CodigoCfg[]; } catch { return CODIGOS_DEFAULT; }
}

export interface DiasEmpleado { employeeId: string; dias: number; vacaciones: number; domingos: number; festivos: number; diasPeriodo: number; fuente: 'asistencias' | 'calendario' | 'fijo'; detalle: Record<string, number>; notas: string[] }

const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const periodosAsis = (tipo: string, inicio: string, fin: string): string[] => {
  const ym = inicio.slice(0, 7);
  if (tipo === 'quincenal') return [`${ym}-${Number(inicio.slice(8, 10)) <= 15 ? 'Q1' : 'Q2'}`];
  return [`${ym}-Q1`, `${ym}-Q2`, ym];
};

/** Días pagados por trabajador para el periodo, leyendo asistencias si está configurada; si no, días calendario / fijos. */
export async function diasDelPeriodo(companyId: string, tipo: 'quincenal' | 'mensual', fecha_inicio: string, fecha_fin: string, diasFijo: number) {
  const emps = await db.employee.findMany({ where: { companyId, estatus: 'activo', periodicidad: tipo } });
  const diasCal = Math.round((Date.parse(fecha_fin) - Date.parse(fecha_inicio)) / 864e5) + 1;
  const out: DiasEmpleado[] = []; let asisOk = false, cerrado: boolean | null = null;
  let diasAsis: Record<string, Record<string, string>> = {}, mapaNumero: Record<string, string> = {}, bajas: Record<string, string> = {}; let festivos: string[] = [];
  const cfg = Object.fromEntries((await codigosCfg(companyId)).map(c => [c.codigo, c]));
  const sinMarca = await reglaSinMarca(companyId);
  if (process.env.ASISTENCIAS_DATABASE_URL) {
    try {
      const pers = periodosAsis(tipo, fecha_inicio, fecha_fin);
      const lecturas = await Promise.all(pers.map(leerAsistencia));
      cerrado = lecturas.some(l => l.cerrado);
      for (const l of lecturas) for (const [emp, dias] of Object.entries(l.dias)) diasAsis[emp] = { ...(diasAsis[emp] ?? {}), ...dias };
      for (const e of await leerEmpleados()) mapaNumero[e.numero] = e.id;
      for (const i of await leerIncidencias(fecha_inicio, fecha_fin)) if (i.tipo === 'Baja' && i.ultimoDia) bajas[i.empId] = i.ultimoDia;
      try { festivos = await leerFestivos(fecha_inicio, fecha_fin); } catch { festivos = []; }
      asisOk = true;
    } catch (e) { console.error('asistencias', (e as Error).message); }
  }
  for (const e of emps) {
    const ingreso = e.fechaIngreso.toISOString().slice(0, 10);
    const notas: string[] = []; const detalle: Record<string, number> = {};
    const asisId = e.asistenciasId ?? mapaNumero[e.numeroEmpleado];
    const usaDias = e.tipoCalculo === 'diario_x_dias';
    const base = usaDias ? diasCal : diasFijo;
    if (asisOk && asisId) {
      const marcas = diasAsis[asisId] ?? {};
      let pagados = 0, domingos = 0, fest = 0;
      for (let d = fecha_inicio; d <= fecha_fin; d = addDays(d, 1)) {
        if (d < ingreso) { detalle['antes_ingreso'] = (detalle['antes_ingreso'] ?? 0) + 1; continue; }
        if (bajas[asisId] && d > bajas[asisId]) { detalle['post_baja'] = (detalle['post_baja'] ?? 0) + 1; continue; }
        const m = marcas[String(Number(d.slice(8, 10)))] ?? marcas[d.slice(8, 10)];
        if (m === undefined || m === '' || m === '-') { detalle['sin_marca'] = (detalle['sin_marca'] ?? 0) + 1; if (sinMarca === 'paga') pagados++; continue; }
        detalle[m] = (detalle[m] ?? 0) + 1;
        const paga = cfg[m]?.paga ?? true; if (paga) pagados++;
        const trabaja = cfg[m]?.trabaja ?? false;
        if (trabaja && new Date(d + 'T00:00:00Z').getUTCDay() === 0) domingos++;
        if (trabaja && (festivos.includes(d) || m === 'DF')) fest++;
      }
      // para quincenal/mensual fijo: días fijos menos los no pagados (no penalizar meses de 31)
      const noPagados = diasCal - pagados;
      const dias = usaDias ? pagados : Math.max(0, diasFijo - noPagados);
      if (!Object.keys(marcas).length) notas.push(sinMarca === 'paga' ? 'Sin marcas en asistencias (todo asistencia)' : 'Sin marcas en asistencias: 0 días pagados');
      if (bajas[asisId]) notas.push(`Baja autorizada, último día ${bajas[asisId]}`);
      if (cerrado === false) notas.push('Periodo NO cerrado en asistencias');
      for (const c of Object.keys(detalle)) if (!cfg[c] && !['antes_ingreso', 'post_baja', 'sin_marca'].includes(c)) notas.push(`Código ${c} no configurado (se pagó)`);
      if (domingos) detalle['domingos'] = domingos; if (fest) detalle['festivos'] = fest;
      out.push({ employeeId: e.id, dias, vacaciones: detalle['V'] ?? 0, domingos, festivos: fest, diasPeriodo: base, fuente: 'asistencias', detalle, notas });
    } else {
      if (asisOk) notas.push('No vinculado con asistencias');
      let dias = base; if (ingreso > fecha_inicio && ingreso <= fecha_fin) { const antes = Math.round((Date.parse(ingreso) - Date.parse(fecha_inicio)) / 864e5); dias = Math.max(0, base - antes); notas.push(`Ingreso ${ingreso}`); }
      out.push({ employeeId: e.id, dias, vacaciones: 0, domingos: 0, festivos: 0, diasPeriodo: base, fuente: usaDias ? 'calendario' : 'fijo', detalle, notas });
    }
  }
  return { emps, dias: out, asistencias: asisOk, cerrado };
}
