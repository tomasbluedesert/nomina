'use server';
import * as XLSX from 'xlsx';
import { db } from './db';
import { companyId } from './actions';
import { hashParams, paramsVigentes } from './params';
import { currentUserEmail } from './supabase';
import { revalidatePath } from 'next/cache';

export type LineaHist = { fila: number; rfc: string; nombre: string; accion: 'importado' | 'error' | 'omitido'; detalle?: string };
const n = (v: unknown) => { const x = Number(v); return isNaN(x) ? 0 : Math.round(x * 100) / 100; };
const s = (v: unknown) => String(v ?? '').trim();
const fechaISO = (v: unknown) => { if (v instanceof Date) return v.toISOString().slice(0, 10); const t = s(v); return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null; };

/** Importa una hoja de nómina histórica (formato de extracción de recibos: una fila fiscal y una fila asimilados por persona). */
export async function importarNominaHistorica(fd: FormData): Promise<{ lineas: LineaHist[]; resumen: Record<string, number>; periodo?: string }> {
  const file = fd.get('archivo') as File | null; if (!file?.size) throw new Error('Selecciona el archivo');
  const hoja = s(fd.get('hoja'));
  const cid = await companyId(); const user = await currentUserEmail();
  const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[hoja || wb.SheetNames[0]]; if (!ws) throw new Error(`No existe la hoja "${hoja}"`);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  const key = (k: string) => k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const R = rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [key(k), v])));
  // agrupar por RFC dentro del mismo rango de periodo global (min inicio, max fin)
  const inicios = R.map(r => fechaISO(r.periodo_inicial)).filter(Boolean) as string[];
  const fines = R.map(r => fechaISO(r.periodo_final)).filter(Boolean) as string[];
  if (!inicios.length) throw new Error('No encontré la columna "Periodo Inicial"; usa el formato de extracción de recibos');
  const ini = inicios.sort()[0], fin = fines.sort().slice(-1)[0];
  const { row: ps } = await paramsVigentes(new Date(fin)).catch(() => ({ row: null as never })) ?? {};
  const emps = await db.employee.findMany({ where: { companyId: cid } });
  const per = await db.payrollPeriod.upsert({ where: { companyId_fechaInicio_fechaFin: { companyId: cid, fechaInicio: new Date(ini), fechaFin: new Date(fin) } }, update: {},
    create: { companyId: cid, tipo: (Date.parse(fin) - Date.parse(ini)) / 864e5 > 20 ? 'mensual' : 'quincenal', fechaInicio: new Date(ini), fechaFin: new Date(fin), paramSetId: ps?.id ?? (await db.fiscalParamSet.findFirstOrThrow({ orderBy: { createdAt: 'desc' } })).id, estado: 'importado' } });
  const porRfc = new Map<string, Record<string, unknown>[]>();
  for (const r of R) { const rfc = s(r.rfc).toUpperCase(); if (!rfc) continue; porRfc.set(rfc, [...(porRfc.get(rfc) ?? []), r]); }
  const lineas: LineaHist[] = []; let fila = 1;
  for (const [rfc, rs] of porRfc) {
    fila++;
    const nombre = s(rs[0].nombre_completo_xml) || `${s(rs[0].nombres ?? rs[0].nombre_s)} ${s(rs[0].apellido_paterno)}`;
    const emp = emps.find(e => e.rfc === rfc);
    if (!emp) { lineas.push({ fila, rfc, nombre, accion: 'error', detalle: 'RFC no existe en el catálogo de trabajadores' }); continue; }
    const sum = (k: string) => rs.reduce((a, r) => a + n(r[k]), 0);
    const fiscalRow = rs.find(r => n(r.sueldo) > 0 || n(r.i_m_s_s) > 0), asimRow = rs.find(r => n(r.honorario_asimilado_a_salario) > 0);
    const brutoAsim = sum('honorario_asimilado_a_salario'), isrAsim = sum('isr_asimilado');
    const sueldo = sum('sueldo'), festivos = sum('dias_de_descanso_obligatorios_laborados'), primaDom = sum('prima_dominical');
    const vac = sum('vacaciones_a_tiempo'), primaVac = sum('prima_de_vacaciones_reportada') + sum('prima_de_vacaciones_a_tiempo'), aguin = sum('aguinaldo');
    const brutoFiscal = n(sueldo + festivos + primaDom + vac + primaVac + aguin);
    const imss = sum('i_m_s_s'), isrFiscal = sum('i_s_r_mes'), subs = sum('subs_al_empleo_mes');
    const ajuste = n(rs.reduce((a, r) => a + Object.entries(r).filter(([k]) => k.startsWith('ajuste_al_neto')).reduce((x, [, v]) => x + n(v), 0), 0));
    const desc = { infonavit: sum('prestamo_infonavit_cf') + sum('seguro_de_vivienda_infonavit'), fonacot: sum('prestamo_fonacot'), pension: sum('desc_por_pension_alimenticia') };
    const otrasDed = n(Object.values(desc).reduce((a, b) => a + b, 0));
    const neto = sum('neto'), dias = fiscalRow ? n(fiscalRow.dias_pagados) : n(rs[0].dias_pagados);
    const netoFiscalSin = n(brutoFiscal - isrFiscal + subs - imss + ajuste);
    const result = {
      periodo: { tipo: per.tipo, fecha_inicio: ini, fecha_fin: fin }, esquema: brutoAsim > 0 && brutoFiscal > 0 ? 'mixto' : brutoAsim > 0 ? 'asimilables' : 'fiscal',
      nomina: { dias_pagados: dias, sueldo_diario: dias ? n(sueldo / Math.max(1, dias)) : 0, bruto_fiscal: brutoFiscal, dias_sueldo: dias, sueldo, dias_vacaciones: 0, vacaciones: vac, prima_vacacional: primaVac, prima_exenta: 0, prima_gravada: primaVac, extras_fiscal: aguin, domingos: 0, prima_dominical: primaDom, prima_dominical_exenta: 0, festivos: 0, pago_festivos: festivos, festivos_exento: 0, base_gravada: brutoFiscal, ajuste_neto: ajuste, isr_tarifa: n(isrFiscal + subs), subsidio: subs, isr_nomina: isrFiscal, subsidio_entregado: 0, sdi: n(fiscalRow?.sbc ?? 0), sdi_fuente: 'registrado', factor_integracion: 0, sbc: n(fiscalRow?.sbc ?? 0), imss_obrero: imss, imss_obrero_detalle: {}, otras_deducciones: otrasDed, descuentos_detalle: Object.fromEntries(Object.entries(desc).filter(([, v]) => v > 0)), neto_fiscal_sin_descuentos: netoFiscalSin, neto_fiscal: n(netoFiscalSin - otrasDed) },
      asimilables: { neto_objetivo: n(brutoAsim - isrAsim), neto_pactado_dias: 0, extras_pactado: 0, extras_neto: 0, bruto: brutoAsim, isr: isrAsim, neto: n(brutoAsim - isrAsim), metodo: 'importado', iteraciones: 0, diff: 0 },
      cargas: { imss_patron: 0, imss_patron_detalle: {}, infonavit: 0, sar: 0, cesantia_vejez: 0, isn: 0, comision_asimilables: 0, iva_comision: 0, prestaciones_periodo: 0, prestaciones_detalle: { aguinaldo: 0, prima_vacacional: 0, adicionales: 0 }, otras_cargas: 0, total: 0 },
      neto_total: neto, neto_pactado: neto, diferencia: 0, costo_real_total: n(brutoFiscal + brutoAsim), carga_laboral: n(brutoFiscal + brutoAsim - neto),
      pct_carga_sobre_neto: 0, pct_carga_sobre_costo: 0, relacion_costo_neto: neto ? Math.round((brutoFiscal + brutoAsim) / neto * 10000) / 10000 : 0,
      warnings: [{ codigo: 'IMPORTADO', mensaje: 'Nómina histórica importada de archivo; cargas patronales no incluidas' }],
    };
    try {
      await db.payrollCalculation.create({ data: { periodId: per.id, employeeId: emp.id, paramSetId: per.paramSetId, paramSetHash: 'importado:' + hashParams({ archivo: file.name, rfc }), calculatedBy: user ?? 'importación', inputSnapshot: { importado: true, archivo: file.name, filas: rs.length } as object, result: result as unknown as object, warnings: result.warnings as unknown as object } });
      lineas.push({ fila, rfc, nombre, accion: 'importado', detalle: `${brutoFiscal ? 'fiscal ' + brutoFiscal.toFixed(2) : ''}${brutoAsim ? ' + asim ' + brutoAsim.toFixed(2) : ''} → neto ${neto.toFixed(2)}` });
    } catch (e) { lineas.push({ fila, rfc, nombre, accion: 'error', detalle: (e as Error).message.split('\n').pop() }); }
  }
  revalidatePath('/historial');
  return { lineas, resumen: lineas.reduce((a, l) => ({ ...a, [l.accion]: (a[l.accion] ?? 0) + 1 }), {} as Record<string, number>), periodo: `${ini} → ${fin}` };
}
