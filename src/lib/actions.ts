'use server';
import { revalidatePath } from 'next/cache';
import { db } from './db';
import type { Prisma } from '@prisma/client';
import { paramsVigentes, hashParams } from './params';
import { currentUserEmail } from './supabase';
import { calcularCostoReal, type EmpleadoInput, type Periodo, type ResultadoTrabajador } from '@engine';
import { rangoPeriodo } from './format';
import { diasDelPeriodo, type DiasEmpleado } from './dias';

export async function companyId() {
  const c = await db.company.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!c) throw new Error('Ejecuta el seed: no hay empresa registrada');
  return c.id;
}

export async function guardarEmpleado(fd: FormData) {
  const cid = await companyId();
  { const pn = String(fd.get('puesto') || '').trim(); if (pn) await db.puesto.upsert({ where: { companyId_nombre: { companyId: cid, nombre: pn } }, update: {}, create: { companyId: cid, nombre: pn } }); }
  const id = String(fd.get('id') || '');
  const data = {
    numeroEmpleado: String(fd.get('numeroEmpleado')).trim(), nombre: String(fd.get('nombre')).trim(), puesto: String(fd.get('puesto')).trim(),
    rfc: String(fd.get('rfc')).trim().toUpperCase(), curp: String(fd.get('curp') || '').trim().toUpperCase() || null, nss: String(fd.get('nss') || '').trim() || null,
    fechaIngreso: new Date(String(fd.get('fechaIngreso'))), estatus: (fd.get('estatus') as 'activo' | 'baja') || 'activo',
    esquema: (fd.get('esquema') as 'fiscal' | 'mixto' | 'asimilables') || 'mixto',
    sueldoDiarioFiscal: Number(fd.get('sueldoDiarioFiscal') || 0), netoPactado: Number(fd.get('netoPactado') || 0),
    periodicidad: fd.get('periodicidad') as 'quincenal' | 'mensual' | 'personalizado', tipoCalculo: fd.get('tipoCalculo') as 'mensual_fijo' | 'quincenal_fijo' | 'diario_x_dias',
    sdiRegistrado: Number(fd.get('sdiRegistrado') || 0) > 0 ? Number(fd.get('sdiRegistrado')) : null,
    descInfonavit: Number(fd.get('descInfonavit') || 0), descFonacot: Number(fd.get('descFonacot') || 0), descPrestamo: Number(fd.get('descPrestamo') || 0), descPension: Number(fd.get('descPension') || 0),
    tipoContratacion: String(fd.get('tipoContratacion') || '') || null, costCenterId: String(fd.get('costCenterId') || '') || null, departmentId: String(fd.get('departmentId') || '') || null,
  };
  if (!(data.sueldoDiarioFiscal > 0)) throw new Error(data.esquema === 'asimilables' ? 'Sueldo diario libre requerido (> 0)' : 'Sueldo diario fiscal requerido (> 0)');
  if (data.esquema === 'mixto' && !(data.netoPactado > 0)) throw new Error('Neto pactado requerido (> 0) para esquema mixto');
  if (data.esquema !== 'mixto') data.netoPactado = 0;
  const dup = await db.employee.findFirst({ where: { companyId: cid, id: { not: id || undefined }, OR: [{ numeroEmpleado: data.numeroEmpleado }, { rfc: data.rfc }] } });
  if (dup) throw new Error(`EMPLEADO_DUPLICADO: ya existe ${dup.numeroEmpleado} / ${dup.rfc}`);
  if (id) await db.employee.update({ where: { id }, data }); else await db.employee.create({ data: { ...data, companyId: cid } });
  revalidatePath('/empleados');
}

/** Paso 1: propone días pagados por trabajador (asistencias o calendario) para revisión antes de calcular. */
export async function prepararPeriodo(tipo: 'quincenal' | 'mensual', anio: number, mes: number, q?: 1 | 2) {
  const cid = await companyId(); const r = rangoPeriodo(tipo, anio, mes, q);
  const { params } = await paramsVigentes(new Date(r.fecha_fin));
  const diasFijo = tipo === 'quincenal' ? params.motor.dias_quincena_fija : params.motor.dias_mes_fijo;
  const d = await diasDelPeriodo(cid, tipo, r.fecha_inicio, r.fecha_fin, diasFijo);
  const borrador = await leerBorrador(cid, r.fecha_inicio, r.fecha_fin);
  return { periodo: { tipo, ...r } as Periodo, asistencias: d.asistencias, cerrado: d.cerrado, borrador: Object.keys(borrador).length > 0,
    filas: d.emps.map(e => { const x = d.dias.find(y => y.employeeId === e.id)!; return { ...x, numero: e.numeroEmpleado, nombre: e.nombre, esquema: e.esquema, tipoCalculo: e.tipoCalculo, diasBorrador: borrador[e.id], vacBorrador: borrador['vac:' + e.id], domBorrador: borrador['dom:' + e.id], festBorrador: borrador['fest:' + e.id] }; }) };
}
const keyBorrador = (i: string, f: string) => `dias_borrador:${i}_${f}`;
async function leerBorrador(cid: string, i: string, f: string): Promise<Record<string, number>> {
  const s = await db.appSetting.findUnique({ where: { companyId_key: { companyId: cid, key: keyBorrador(i, f) } } });
  try { return s ? JSON.parse(s.value) : {}; } catch { return {}; }
}
/** Guarda los días editados del periodo para que no se pierdan al salir de la pantalla. */
export async function guardarBorradorDias(fecha_inicio: string, fecha_fin: string, dias: Record<string, number>) {
  const cid = await companyId(); const key = keyBorrador(fecha_inicio, fecha_fin); const value = JSON.stringify(dias);
  await db.appSetting.upsert({ where: { companyId_key: { companyId: cid, key } }, update: { value }, create: { companyId: cid, key, value } });
}
export async function guardarReglaSinMarca(v: 'paga' | 'no_paga') {
  const cid = await companyId();
  await db.appSetting.upsert({ where: { companyId_key: { companyId: cid, key: 'sin_marca' } }, update: { value: v }, create: { companyId: cid, key: 'sin_marca', value: v } });
  revalidatePath('/asistencias');
}
export async function leerReglaSinMarca() { const cid = await companyId(); const { reglaSinMarca } = await import('./dias'); return reglaSinMarca(cid); }

export async function listarPagosExtra(fecha_inicio: string, fecha_fin: string) {
  const cid = await companyId();
  const rows = await db.pagoExtra.findMany({ where: { companyId: cid, fechaInicio: new Date(fecha_inicio), fechaFin: new Date(fecha_fin) }, orderBy: { createdAt: 'asc' }, include: { employee: true } });
  return rows.map(r => ({ id: r.id, employeeId: r.employeeId, numero: r.employee.numeroEmpleado, nombre: r.employee.nombre, concepto: r.concepto, importe: Number(r.importe), destino: r.destino as 'fiscal' | 'asimilables' }));
}
export async function agregarPagoExtra(fecha_inicio: string, fecha_fin: string, employeeId: string, concepto: string, importe: number, destino: 'fiscal' | 'asimilables') {
  const cid = await companyId(); if (!(importe > 0)) throw new Error('Importe debe ser > 0'); if (!concepto.trim()) throw new Error('Concepto requerido');
  await db.pagoExtra.create({ data: { companyId: cid, employeeId, fechaInicio: new Date(fecha_inicio), fechaFin: new Date(fecha_fin), concepto: concepto.trim(), importe, destino, createdBy: await currentUserEmail() } });
  return listarPagosExtra(fecha_inicio, fecha_fin);
}
export async function eliminarPagoExtra(id: string, fecha_inicio: string, fecha_fin: string) { await db.pagoExtra.delete({ where: { id } }); return listarPagosExtra(fecha_inicio, fecha_fin); }

export async function calcularPeriodo(tipo: 'quincenal' | 'mensual', anio: number, mes: number, q?: 1 | 2, diasPorEmpleado?: Record<string, { dias: number; vacaciones?: number; domingos?: number; festivos?: number; detalle?: Record<string, number>; fuente?: string }>, overridesPorEmpleado?: Record<string, { isr_nomina?: number; imss_obrero?: number; subsidio?: number; asimilables?: { bruto: number; isr: number } }>) {
  const cid = await companyId();
  const r = rangoPeriodo(tipo, anio, mes, q);
  const periodo: Periodo = { tipo, ...r };
  const { row, params } = await paramsVigentes(new Date(r.fecha_fin));
  const hash = hashParams(params);
  const user = await currentUserEmail();
  const per = await db.payrollPeriod.upsert({ where: { companyId_fechaInicio_fechaFin: { companyId: cid, fechaInicio: new Date(r.fecha_inicio), fechaFin: new Date(r.fecha_fin) } },
    update: {}, create: { companyId: cid, tipo, fechaInicio: new Date(r.fecha_inicio), fechaFin: new Date(r.fecha_fin), paramSetId: row.id } });
  const emps = await db.employee.findMany({ where: { companyId: cid, estatus: 'activo', periodicidad: tipo } });
  const extras = await db.pagoExtra.findMany({ where: { companyId: cid, fechaInicio: new Date(r.fecha_inicio), fechaFin: new Date(r.fecha_fin) } });
  const out: { empleado: string; nombre: string; resultado?: ResultadoTrabajador; error?: string }[] = [];
  for (const e of emps) {
    const ex = extras.filter(x => x.employeeId === e.id);
    const extrasInput = ex.length ? { fiscal: ex.filter(x => x.destino === 'fiscal').reduce((a, x) => a + Number(x.importe), 0), asimilables: ex.filter(x => x.destino === 'asimilables').reduce((a, x) => a + Number(x.importe), 0), detalle: ex.map(x => ({ concepto: x.concepto, importe: Number(x.importe), destino: x.destino as 'fiscal' | 'asimilables' })) } : undefined;
    const input: EmpleadoInput = { numero_empleado: e.numeroEmpleado, nombre: e.nombre, esquema: e.esquema, sueldo_diario_fiscal: Number(e.sueldoDiarioFiscal), neto_pactado: Number(e.netoPactado),
      tipo_calculo: e.tipoCalculo, fecha_ingreso: e.fechaIngreso.toISOString().slice(0, 10), zona_frontera: e.zonaFrontera,
      sdi_override: e.sdiRegistrado ? Number(e.sdiRegistrado) : undefined, dias_override: diasPorEmpleado?.[e.id]?.dias, dias_detalle: diasPorEmpleado?.[e.id]?.detalle, dias_vacaciones: e.esquema === 'asimilables' ? 0 : diasPorEmpleado?.[e.id]?.vacaciones, domingos_trabajados: diasPorEmpleado?.[e.id]?.domingos, festivos_trabajados: diasPorEmpleado?.[e.id]?.festivos,
      descuentos: { infonavit: Number(e.descInfonavit), fonacot: Number(e.descFonacot), prestamo: Number(e.descPrestamo), pension: Number(e.descPension) }, extras: extrasInput, overrides: overridesPorEmpleado?.[e.id] };
    try {
      const res = calcularCostoReal(input, periodo, params);
      await db.payrollCalculation.create({ data: { periodId: per.id, employeeId: e.id, paramSetId: row.id, paramSetHash: hash, calculatedBy: user, inputSnapshot: { ...input, dias_fuente: diasPorEmpleado?.[e.id]?.fuente, ajuste_layout: !!overridesPorEmpleado?.[e.id] } as Prisma.InputJsonValue, result: res as unknown as Prisma.InputJsonValue, warnings: res.warnings as unknown as Prisma.InputJsonValue } });
      out.push({ empleado: e.numeroEmpleado, nombre: e.nombre, resultado: res });
    } catch (err) { out.push({ empleado: e.numeroEmpleado, nombre: e.nombre, error: (err as Error).message }); }
  }
  revalidatePath('/'); revalidatePath('/nomina');
  return { periodo, paramSet: `${row.ejercicio} v${row.version}`, resultados: out };
}

export async function guardarCodigos(json: string) {
  const cid = await companyId(); JSON.parse(json);
  await db.appSetting.upsert({ where: { companyId_key: { companyId: cid, key: 'codigos_asistencia' } }, update: { value: json }, create: { companyId: cid, key: 'codigos_asistencia', value: json } });
  revalidatePath('/asistencias');
}
export async function leerCodigos() { const cid = await companyId(); const { codigosCfg } = await import('./dias'); return codigosCfg(cid); }

/** Crea una nueva versión del param set vigente con la comisión de asimilables y la activa (los históricos conservan su hash). */
export async function agregarComisionAsimilables(pct: number, iva_pct: number) {
  const vig = await db.fiscalParamSet.findFirst({ where: { estado: 'vigente' }, orderBy: [{ ejercicio: 'desc' }, { version: 'desc' }] });
  if (!vig) throw new Error('No hay parámetros vigentes');
  const data = { ...(vig.data as Record<string, unknown>), asimilables_comision: { pct, iva_pct }, version: vig.version + 1 } as Prisma.InputJsonValue;
  const user = await currentUserEmail();
  await db.$transaction([
    db.fiscalParamSet.update({ where: { id: vig.id }, data: { estado: 'vencido' } }),
    db.fiscalParamSet.create({ data: { ejercicio: vig.ejercicio, version: vig.version + 1, vigenciaDesde: vig.vigenciaDesde, vigenciaHasta: vig.vigenciaHasta, estado: 'vigente', data, hashSha256: hashParams(data), createdBy: user } }),
  ]);
  revalidatePath('/configuracion-fiscal');
}

/** Guarda parámetros editados: como nueva versión (borrador) o sobrescribiendo un borrador existente. */
export async function guardarVersionParams(json: string, modo: 'nueva' | 'sobrescribir', baseId: string) {
  const data = JSON.parse(json);
  if (!data.ejercicio || !data.vigencia_desde || !data.vigencia_hasta || !data.uma_diaria || !data.isr?.quincenal?.length || !data.isr?.mensual?.length) throw new Error('Faltan datos: ejercicio, vigencia, UMA o tarifas ISR');
  if (data.vigencia_desde > data.vigencia_hasta) throw new Error('La vigencia "desde" no puede ser mayor que "hasta"');
  const user = await currentUserEmail();
  const base = await db.fiscalParamSet.findUniqueOrThrow({ where: { id: baseId } });
  if (modo === 'sobrescribir') {
    if (base.estado !== 'borrador') throw new Error('Solo se puede sobrescribir un borrador; guarda como nueva versión');
    data.version = base.version;
    await db.fiscalParamSet.update({ where: { id: baseId }, data: { ejercicio: data.ejercicio, vigenciaDesde: new Date(data.vigencia_desde), vigenciaHasta: new Date(data.vigencia_hasta), data, hashSha256: hashParams(data), createdBy: user } });
    revalidatePath('/configuracion-fiscal'); return `Borrador ${data.ejercicio} v${base.version} actualizado`;
  }
  const max = await db.fiscalParamSet.aggregate({ where: { ejercicio: data.ejercicio }, _max: { version: true } });
  const version = (max._max.version ?? 0) + 1; data.version = version;
  await db.fiscalParamSet.create({ data: { ejercicio: data.ejercicio, version, vigenciaDesde: new Date(data.vigencia_desde), vigenciaHasta: new Date(data.vigencia_hasta), estado: 'borrador', data, hashSha256: hashParams(data), createdBy: user } });
  revalidatePath('/configuracion-fiscal'); return `Guardada ${data.ejercicio} v${version} como borrador; actívala en Configuración fiscal`;
}

export async function guardarParamSet(fd: FormData) {
  const data = JSON.parse(String(fd.get('json')));
  const ejercicio = Number(data.ejercicio), version = Number(fd.get('version') || 1);
  const user = await currentUserEmail();
  await db.fiscalParamSet.create({ data: { ejercicio, version, vigenciaDesde: new Date(data.vigencia_desde), vigenciaHasta: new Date(data.vigencia_hasta), estado: 'borrador', data, hashSha256: hashParams(data), createdBy: user } });
  revalidatePath('/configuracion-fiscal');
}
export async function activarParamSet(id: string) {
  const ps = await db.fiscalParamSet.findUniqueOrThrow({ where: { id } });
  await db.$transaction([
    db.fiscalParamSet.updateMany({ where: { id: { not: id }, estado: 'vigente', vigenciaDesde: { lte: ps.vigenciaHasta }, vigenciaHasta: { gte: ps.vigenciaDesde } }, data: { estado: 'vencido' } }),
    db.fiscalParamSet.update({ where: { id }, data: { estado: 'vigente' } }),
  ]);
  revalidatePath('/configuracion-fiscal');
}

/** Lee el layout de ISR/IMSS oficiales (columnas: rfc o numero_empleado, isr, imss, subsidio opcional) y devuelve overrides por employeeId. */
export async function leerLayoutOficial(fd: FormData): Promise<{ overrides: Record<string, { isr_nomina?: number; imss_obrero?: number; subsidio?: number; asimilables?: { bruto: number; isr: number } }>; encontrados: number; sinMatch: string[] }> {
  const XLSX = await import('xlsx');
  const file = fd.get('archivo') as File | null; if (!file?.size) throw new Error('Selecciona el layout');
  const cid = await companyId();
  const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const key = (k: string) => k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const emps = await db.employee.findMany({ where: { companyId: cid } });
  const overrides: Record<string, { isr_nomina?: number; imss_obrero?: number; subsidio?: number; asimilables?: { bruto: number; isr: number } }> = {}; const sinMatch: string[] = [];
  for (const raw of rows) {
    const f = Object.fromEntries(Object.entries(raw).map(([k, v]) => [key(k), v]));
    const rfc = String(f.rfc ?? '').trim().toUpperCase(), num = String(f.numero_empleado ?? f.no_empleado ?? f.numero ?? '').trim();
    if (!rfc && !num) continue;
    const e = emps.find(x => (rfc && x.rfc === rfc) || (num && x.numeroEmpleado === num));
    if (!e) { sinMatch.push(rfc || num); continue; }
    const n = (v: unknown) => { const x = Number(String(v ?? '').replace(/[$,\s]/g, '')); return isNaN(x) ? undefined : Math.round(x * 100) / 100; };
    const o: { isr_nomina?: number; imss_obrero?: number; subsidio?: number; asimilables?: { bruto: number; isr: number } } = { isr_nomina: n(f.isr ?? f.i_s_r_mes ?? f.isr_retenido), imss_obrero: n(f.imss ?? f.i_m_s_s), subsidio: n(f.subsidio ?? f.subs_al_empleo_mes) };
    const ab = n(f.bruto_asimilables ?? f.honorario_asimilado_a_salario), ai = n(f.isr_asimilado ?? f.isr_asimilables);
    const prev = overrides[e.id] ?? {};
    if (ab !== undefined && ab > 0 && ai !== undefined) o.asimilables = { bruto: ab, isr: ai };
    const merged = { ...prev, ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) };
    // filas de asimilados puros: no pisar ISR/IMSS fiscales con ceros
    if (prev.isr_nomina !== undefined && (o.isr_nomina === 0 || o.isr_nomina === undefined) && ab) merged.isr_nomina = prev.isr_nomina;
    if (prev.imss_obrero !== undefined && (o.imss_obrero === 0 || o.imss_obrero === undefined) && ab) merged.imss_obrero = prev.imss_obrero;
    if (Object.keys(merged).length) overrides[e.id] = merged;
  }
  return { overrides, encontrados: Object.keys(overrides).length, sinMatch };
}
