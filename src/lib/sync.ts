'use server';
import { db } from './db';
import { companyId } from './actions';
import { leerEmpleados, leerCatalogos, probarConexion } from './asistencias';
import { revalidatePath } from 'next/cache';

export type LineaSync = { numero: string; nombre: string; accion: 'creado' | 'actualizado' | 'sin_cambio' | 'pendiente_sueldo' | 'error'; detalle?: string };

export async function probarAsistencias() { try { const r = await probarConexion(); return { ok: true, ...r }; } catch (e) { return { ok: false, error: (e as Error).message }; } }

/** Trae deptos y centros de asistencias como centros de costos (tipo departamento / propiedad). */
export async function sincronizarCatalogos() {
  const cid = await companyId(); const cat = await leerCatalogos(); let creados = 0;
  const ex = await db.costCenter.findMany({ where: { companyId: cid } });
  for (const [tipo, lista] of [['departamento', cat.deptos ?? []], ['propiedad', cat.centros ?? []]] as const)
    for (const nombre of lista) if (!ex.some(c => c.nombre.toLowerCase() === nombre.toLowerCase())) { await db.costCenter.create({ data: { companyId: cid, nombre, tipo } }); creados++; }
  const exP = await db.puesto.findMany({ where: { companyId: cid } });
  for (const nombre of cat.puestos ?? []) if (!exP.some(x => x.nombre.toLowerCase() === nombre.toLowerCase())) { await db.puesto.create({ data: { companyId: cid, nombre } }); creados++; }
  revalidatePath('/centros-costos'); return { creados, deptos: (cat.deptos ?? []).length, centros: (cat.centros ?? []).length, puestos: (cat.puestos ?? []).length };
}

/**
 * Sincroniza trabajadores por número de empleado. Datos de identidad vienen de asistencias; sueldo diario fiscal
 * y neto pactado se conservan si ya existen en nómina; si es alta nueva se toman salarioDiario / salarioMensual
 * de asistencias como valor inicial y se marca pendiente_sueldo para revisión.
 */
export async function sincronizarEmpleados(opts: { soloActivos: boolean; sobrescribirSueldos: boolean; traerDescuentos?: boolean; traerSdi?: boolean }) {
  const cid = await companyId();
  const [src, ccs, ex] = await Promise.all([leerEmpleados(), db.costCenter.findMany({ where: { companyId: cid } }), db.employee.findMany({ where: { companyId: cid } })]);
  const lineas: LineaSync[] = [];
  for (const e of src) {
    if (opts.soloActivos && !e.activo) continue;
    if (!e.numero || !e.rfc) { lineas.push({ numero: e.numero, nombre: e.nombre, accion: 'error', detalle: 'Sin número o RFC en asistencias' }); continue; }
    const dep = e.depto ? ccs.find(c => c.nombre.toLowerCase() === e.depto!.toLowerCase()) : undefined;
    let cc = e.centro ? ccs.find(c => c.nombre.toLowerCase() === e.centro!.toLowerCase()) : undefined;
    if (!cc && e.centro) { cc = await db.costCenter.create({ data: { companyId: cid, nombre: e.centro, tipo: 'propiedad' } }); ccs.push(cc); }
    const periodicidad = (e.claseNomina ?? '').toUpperCase().startsWith('MEN') ? 'mensual' : 'quincenal';
    const tc = (e.tipoColaborador ?? '').toLowerCase();
    const esquema = (tc.includes('asimil') || tc.includes('honorario') ? 'asimilables' : 'mixto') as 'fiscal' | 'mixto' | 'asimilables';
    const base = { nombre: e.nombre, puesto: e.puesto, rfc: e.rfc, curp: e.curp, nss: e.nss, fechaIngreso: new Date(e.fechaIngreso ?? new Date().toISOString().slice(0, 10)),
      estatus: (e.activo ? 'activo' : 'baja') as 'activo' | 'baja', periodicidad: periodicidad as 'quincenal' | 'mensual', costCenterId: cc?.id ?? null, departmentId: dep?.id ?? null,
      tipoContratacion: [e.tipoColaborador, e.tipoContrato].filter(Boolean).join(' / ') || null, asistenciasId: e.id,
      ...(opts.traerDescuentos ? { descInfonavit: e.infonavit ?? 0, descFonacot: e.fonacot ?? 0, descPension: e.pensiones ?? 0 } : {}),
      ...(opts.traerSdi ? { sdiRegistrado: e.salarioIntegrado && e.salarioIntegrado > 0 ? e.salarioIntegrado : null } : {}) };
    const actual = ex.find(x => x.numeroEmpleado === e.numero) ?? ex.find(x => x.rfc === e.rfc);
    // valores iniciales de sueldo desde asistencias (por periodo según periodicidad)
    const sdIni = e.salarioDiario ?? (e.salarioMensual ? e.salarioMensual / 30 : null);
    const netoIni = e.salarioMensual ? (periodicidad === 'quincenal' ? e.salarioMensual / 2 : e.salarioMensual) : (e.salarioDiario ? e.salarioDiario * (periodicidad === 'quincenal' ? 15 : 30) : null);
    try {
      if (actual) {
        const sueldos = opts.sobrescribirSueldos && sdIni && netoIni ? { sueldoDiarioFiscal: sdIni, netoPactado: netoIni } : {};
        await db.employee.update({ where: { id: actual.id }, data: { ...base, ...sueldos } });
        lineas.push({ numero: e.numero, nombre: e.nombre, accion: 'actualizado' });
      } else {
        if (esquema === 'asimilables' ? !sdIni : (!sdIni || !netoIni)) { lineas.push({ numero: e.numero, nombre: e.nombre, accion: 'error', detalle: 'Sin salario en asistencias: captúralo en nómina y vuelve a sincronizar' }); continue; }
        await db.employee.create({ data: { ...base, esquema, companyId: cid, numeroEmpleado: e.numero, tipoCalculo: esquema === 'asimilables' ? 'diario_x_dias' : periodicidad === 'quincenal' ? 'quincenal_fijo' : 'mensual_fijo', sueldoDiarioFiscal: Math.round(sdIni! * 100) / 100, netoPactado: esquema === 'asimilables' ? 0 : Math.round(netoIni! * 100) / 100 } });
        lineas.push({ numero: e.numero, nombre: e.nombre, accion: 'pendiente_sueldo', detalle: `Creado como ${esquema} con SD ${(sdIni ?? 0).toFixed(2)} y neto ${(netoIni ?? 0).toFixed(2)} tomados de asistencias: revisa sueldo diario fiscal y neto pactado` });
      }
    } catch (err) { lineas.push({ numero: e.numero, nombre: e.nombre, accion: 'error', detalle: (err as Error).message.split('\n').pop() }); }
  }
  revalidatePath('/empleados');
  return { lineas, resumen: lineas.reduce((a, l) => ({ ...a, [l.accion]: (a[l.accion] ?? 0) + 1 }), {} as Record<string, number>) };
}
