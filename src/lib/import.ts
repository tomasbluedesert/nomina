'use server';
import * as XLSX from 'xlsx';
import { db } from './db';
import { companyId } from './actions';
import { revalidatePath } from 'next/cache';

const COLUMNAS = ['numero_empleado', 'nombre', 'puesto', 'rfc', 'curp', 'nss', 'fecha_ingreso', 'estatus', 'esquema', 'sueldo_diario_fiscal', 'neto_pactado', 'periodicidad', 'tipo_calculo', 'departamento', 'centro_costos', 'tipo_contratacion', 'sdi_registrado', 'desc_infonavit', 'desc_fonacot', 'desc_prestamo', 'desc_pension'] as const;
type Fila = Record<(typeof COLUMNAS)[number], string>;
export type ResultadoFila = { fila: number; numero: string; nombre: string; accion: 'creado' | 'actualizado' | 'error' | 'omitido'; detalle?: string };

const norm = (s: unknown) => String(s ?? '').trim();
const PER: Record<string, 'quincenal' | 'mensual' | 'personalizado'> = { quincenal: 'quincenal', quincena: 'quincenal', q: 'quincenal', mensual: 'mensual', mes: 'mensual', m: 'mensual', personalizado: 'personalizado' };
const CALC: Record<string, 'mensual_fijo' | 'quincenal_fijo' | 'diario_x_dias'> = { mensual_fijo: 'mensual_fijo', 'mensual fijo': 'mensual_fijo', quincenal_fijo: 'quincenal_fijo', 'quincenal fijo': 'quincenal_fijo', diario_x_dias: 'diario_x_dias', 'dias reales': 'diario_x_dias', 'días reales': 'diario_x_dias', diario: 'diario_x_dias' };

function fecha(v: unknown): Date | null {
  if (v instanceof Date) return v;
  const s = norm(v); if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.slice(0, 10));
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/); // dd/mm/aaaa
  if (m) return new Date(`${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  if (/^\d+$/.test(s)) { const d = XLSX.SSF.parse_date_code(Number(s)); return d ? new Date(Date.UTC(d.y, d.m - 1, d.d)) : null; }
  const d = new Date(s); return isNaN(d.getTime()) ? null : d;
}
const numero = (v: unknown) => { const n = Number(norm(v).replace(/[$,\s]/g, '')); return isNaN(n) ? NaN : n; };

export async function importarEmpleados(fd: FormData): Promise<{ resultados: ResultadoFila[]; resumen: Record<string, number> }> {
  const file = fd.get('archivo') as File | null;
  if (!file || !file.size) throw new Error('Selecciona un archivo .xlsx o .csv');
  const cid = await companyId();
  const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  if (!rows.length) throw new Error('El archivo no tiene filas de datos');
  // encabezados tolerantes: minúsculas, sin acentos, espacios → _
  const key = (k: string) => k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const ccs = await db.costCenter.findMany({ where: { companyId: cid } });
  const existentes = await db.employee.findMany({ where: { companyId: cid }, select: { id: true, numeroEmpleado: true, rfc: true } });
  const resultados: ResultadoFila[] = []; const vistos = new Set<string>(); const rfcs = new Set<string>();

  for (const [i, raw] of rows.entries()) {
    const f = Object.fromEntries(Object.entries(raw).map(([k, v]) => [key(k), v])) as Partial<Fila>;
    const fila = i + 2, num = norm(f.numero_empleado), nombre = norm(f.nombre), rfc = norm(f.rfc).toUpperCase();
    const err = (detalle: string) => resultados.push({ fila, numero: num, nombre, accion: 'error', detalle });
    if (!num && !nombre) { resultados.push({ fila, numero: '', nombre: '', accion: 'omitido', detalle: 'Fila vacía' }); continue; }
    if (!num) { err('Falta numero_empleado'); continue; }
    if (!nombre) { err('Falta nombre'); continue; }
    if (!rfc || rfc.length < 12) { err('RFC faltante o inválido'); continue; }
    if (vistos.has(num)) { err('EMPLEADO_DUPLICADO: número repetido dentro del archivo'); continue; }
    if (rfcs.has(rfc)) { err('EMPLEADO_DUPLICADO: RFC repetido dentro del archivo'); continue; }
    const esqRaw = norm(f.esquema).toLowerCase(); const esquema = (esqRaw.startsWith('fis') ? 'fiscal' : esqRaw.startsWith('asim') ? 'asimilables' : 'mixto') as 'fiscal' | 'mixto' | 'asimilables';
    let sd = numero(f.sueldo_diario_fiscal), neto = numero(f.neto_pactado); if (isNaN(sd)) sd = 0; if (isNaN(neto)) neto = 0;
    if (!(sd > 0)) { err('SUELDO_DIARIO_INVALIDO: debe ser > 0 (fiscal/mixto: SD fiscal; asimilables: SD libre)'); continue; }
    if (esquema === 'mixto' && !(neto > 0)) { err('Neto pactado debe ser > 0 para esquema mixto'); continue; }
    if (esquema !== 'mixto') neto = 0;
    const fi = fecha(f.fecha_ingreso); if (!fi) { err('fecha_ingreso inválida (usa AAAA-MM-DD o DD/MM/AAAA)'); continue; }
    const periodicidad = PER[norm(f.periodicidad).toLowerCase()] ?? 'quincenal';
    const tipoCalculo = CALC[norm(f.tipo_calculo).toLowerCase()] ?? (periodicidad === 'mensual' ? 'mensual_fijo' : 'quincenal_fijo');
    const estatus = norm(f.estatus).toLowerCase() === 'baja' ? 'baja' : 'activo';
    let costCenterId: string | null = null; const ccn = norm(f.centro_costos);
    if (ccn) { let cc = ccs.find(c => c.nombre.toLowerCase() === ccn.toLowerCase()); if (!cc) { cc = await db.costCenter.create({ data: { companyId: cid, nombre: ccn, tipo: 'centro_costos' } }); ccs.push(cc); } costCenterId = cc.id; }
    let departmentId: string | null = null; const dn = norm(f.departamento);
    if (dn) { let d = ccs.find(c => c.nombre.toLowerCase() === dn.toLowerCase()); if (!d) { d = await db.costCenter.create({ data: { companyId: cid, nombre: dn, tipo: 'departamento' } }); ccs.push(d); } departmentId = d.id; }
    { const pn = norm(f.puesto); if (pn) await db.puesto.upsert({ where: { companyId_nombre: { companyId: cid, nombre: pn } }, update: {}, create: { companyId: cid, nombre: pn } }); }
    const data = { nombre, puesto: norm(f.puesto) || 'Sin puesto', rfc, curp: norm(f.curp).toUpperCase() || null, nss: norm(f.nss) || null, fechaIngreso: fi, estatus: estatus as 'activo' | 'baja', esquema, sueldoDiarioFiscal: sd, netoPactado: neto, periodicidad, tipoCalculo, costCenterId, departmentId, sdiRegistrado: numero(f.sdi_registrado) > 0 ? numero(f.sdi_registrado) : null, descInfonavit: numero(f.desc_infonavit) || 0, descFonacot: numero(f.desc_fonacot) || 0, descPrestamo: numero(f.desc_prestamo) || 0, descPension: numero(f.desc_pension) || 0, tipoContratacion: norm(f.tipo_contratacion) || null };
    const porNum = existentes.find(e => e.numeroEmpleado === num), porRfc = existentes.find(e => e.rfc === rfc);
    if (porRfc && porRfc.numeroEmpleado !== num) { err(`EMPLEADO_DUPLICADO: el RFC ya pertenece al empleado ${porRfc.numeroEmpleado}`); continue; }
    try {
      if (porNum) { await db.employee.update({ where: { id: porNum.id }, data }); resultados.push({ fila, numero: num, nombre, accion: 'actualizado' }); }
      else { const e = await db.employee.create({ data: { ...data, companyId: cid, numeroEmpleado: num } }); existentes.push({ id: e.id, numeroEmpleado: num, rfc }); resultados.push({ fila, numero: num, nombre, accion: 'creado' }); }
      vistos.add(num); rfcs.add(rfc);
    } catch (e) { err((e as Error).message.split('\n').pop() ?? 'Error al guardar'); }
  }
  revalidatePath('/empleados');
  const resumen = resultados.reduce((a, r) => ({ ...a, [r.accion]: (a[r.accion] ?? 0) + 1 }), {} as Record<string, number>);
  return { resultados, resumen };
}

export async function plantillaBase64(conDatos = false): Promise<string> {
  const filasDatos: (string | number)[][] = [];
  if (conDatos) {
    const cid = await companyId();
    const emps = await db.employee.findMany({ where: { companyId: cid }, orderBy: { numeroEmpleado: 'asc' }, include: { costCenter: true, department: true } });
    for (const e of emps) filasDatos.push([e.numeroEmpleado, e.nombre, e.puesto, e.rfc, e.curp ?? '', e.nss ?? '', e.fechaIngreso.toISOString().slice(0, 10), e.estatus, e.esquema,
      e.esquema === 'asimilables' ? Number(e.sueldoDiarioFiscal) : Number(e.sueldoDiarioFiscal), e.esquema === 'mixto' ? Number(e.netoPactado) : '', e.periodicidad, e.tipoCalculo, e.department?.nombre ?? '', e.costCenter?.nombre ?? '', e.tipoContratacion ?? '', e.sdiRegistrado ? Number(e.sdiRegistrado) : '', Number(e.descInfonavit) || '', Number(e.descFonacot) || '', Number(e.descPrestamo) || '', Number(e.descPension) || '']);
  }
  const ws = XLSX.utils.aoa_to_sheet([
    [...COLUMNAS],
    ...(conDatos ? filasDatos : [
    ['001', 'Ejemplo Pérez López', 'Concierge', 'PELE900101ABC', 'PELE900101HBSRPJ01', '12345678901', '2022-05-10', 'activo', 'mixto', 1026.33, 25000, 'quincenal', 'quincenal_fijo', 'Housekeeping', 'Casa del Mar', 'Planta', '', 850, '', '', ''],
    ['002', 'Ejemplo García Ruiz', 'Mantenimiento', 'GARE850315XYZ', '', '', '15/11/2025', 'activo', 'fiscal', 500, '', 'mensual', 'diario_x_dias', 'Finanzas', 'Oficina Finanzas', '', '', '', '', '', 3795.84],
    ['003', 'Ejemplo Soto Vega', 'Camarista', 'SOVE880220QRS', '', '', '2026-01-15', 'activo', 'asimilables', 750, '', 'quincenal', 'diario_x_dias', 'Housekeeping', 'Variable', 'Eventual', '', '', '', '', ''],
  ]),
  ]);
  ws['!cols'] = COLUMNAS.map(c => ({ wch: Math.max(14, c.length + 2) }));
  const notas = XLSX.utils.aoa_to_sheet([
    ['Campo', 'Valores aceptados'],
    ['numero_empleado', 'Obligatorio. Clave única; si ya existe, se actualiza el registro'],
    ['rfc', 'Obligatorio, 12 o 13 caracteres. No puede repetirse entre empleados'],
    ['fecha_ingreso', 'AAAA-MM-DD, DD/MM/AAAA o fecha de Excel'],
    ['estatus', 'activo | baja (vacío = activo)'],
    ['esquema', 'fiscal (SD fiscal × días, neto_pactado vacío) | mixto (SD fiscal + neto pactado) | asimilables (sueldo_diario_fiscal = sueldo diario LIBRE × días trabajados, neto_pactado vacío). Vacío = mixto'],
    ['sueldo_diario_fiscal', 'Número > 0. En esquema asimilables es el sueldo diario libre (neto) que cobra por día trabajado'],
    ['neto_pactado', 'Solo esquema mixto. Neto por periodo (quincenal o mensual según periodicidad)'],
    ['periodicidad', 'quincenal | mensual | personalizado (vacío = quincenal)'],
    ['tipo_calculo', 'quincenal_fijo | mensual_fijo | diario_x_dias (vacío = según periodicidad)'],
    ['departamento', 'Nombre libre; se crea si no existe (Housekeeping, Finanzas…)'],
    ['centro_costos', 'Propiedad u oficina; se crea si no existe (Casa del Mar, Oficina Finanzas…)'],
    ['puesto', 'Nombre libre; se agrega al catálogo de puestos'],
    ['sdi_registrado', 'SDI registrado ante IMSS. Si se captura, la nómina lo usa tal cual; vacío = se calcula con factor de integración'],
    ['desc_infonavit / desc_fonacot / desc_prestamo / desc_pension', 'Importe a descontar por periodo en nómina fiscal (vacío = 0). No aplican a asimilables puros'],
  ]);
  notas['!cols'] = [{ wch: 36 }, { wch: 80 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Empleados'); XLSX.utils.book_append_sheet(wb, notas, 'Instrucciones');
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}
