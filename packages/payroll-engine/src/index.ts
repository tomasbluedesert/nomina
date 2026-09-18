import type { FiscalParamSet, IsrBracket, Periodo, EmpleadoInput, NominaFiscal, Asimilables, CargasPatronales, ResultadoTrabajador, Warning } from './types';
export * from './types';

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export class PayrollError extends Error { constructor(public codigo: string, msg: string) { super(msg); } }

// ---------- Periodo ----------
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;

export function diasPagados(emp: EmpleadoInput, p: Periodo, prm: FiscalParamSet): number {
  if (emp.dias_override !== undefined && emp.dias_override !== null && emp.dias_override >= 0) return emp.dias_override;
  if (emp.tipo_calculo === 'mensual_fijo') return prm.motor.dias_mes_fijo;
  if (emp.tipo_calculo === 'quincenal_fijo') return prm.motor.dias_quincena_fija;
  return daysBetween(p.fecha_inicio, p.fecha_fin);
}

/** Tarifa aplicable. Personalizado: se escala la tarifa mensual por días/30 (opción del motor). */
export function tarifaISR(p: Periodo, dias: number, prm: FiscalParamSet): IsrBracket[] {
  if (p.tipo === 'quincenal') return prm.isr.quincenal;
  if (p.tipo === 'mensual') return prm.isr.mensual;
  const f = dias / prm.subsidio.dias_base_mensual;
  return prm.isr.mensual.map(b => ({ li: b.li * f, ls: b.ls === null ? null : b.ls * f, cf: b.cf * f, pct: b.pct }));
}

// ---------- ISR ----------
export function isr(ingreso: number, tarifa: IsrBracket[]): number {
  if (ingreso <= 0) return 0;
  const t = tarifa.find(b => ingreso >= b.li && (b.ls === null || ingreso <= b.ls)) ?? tarifa[tarifa.length - 1];
  return r2(t.cf + (ingreso - t.li) * t.pct);
}

/** Subsidio 2024+: monto fijo mensual si el ingreso del periodo ≤ límite (ambos proporcionales a días). */
export function subsidio(ingreso: number, dias: number, prm: FiscalParamSet): number {
  const s = prm.subsidio; if (!s.aplica) return 0;
  const f = dias / s.dias_base_mensual;
  const limite = r2(s.limite_ingreso_mensual * f);
  if (ingreso > limite) return 0;
  if (dias === prm.motor.dias_quincena_fija && s.monto_quincenal) return r2(s.monto_quincenal);
  return r2(s.monto_mensual * f);
}

// ---------- Inverso ----------
export function brutoDesdeNeto(netoObjetivo: number, tarifa: IsrBracket[], prm: FiscalParamSet) {
  const tol = prm.motor.tolerancia;
  if (netoObjetivo <= 0) return { bruto: 0, metodo: 'none', iteraciones: 0, diff: 0 };
  const neto = (b: number) => r2(b - isr(b, tarifa));
  for (const t of tarifa) {
    const nLI = neto(t.li), nLS = t.ls === null ? Infinity : neto(t.ls);
    if (netoObjetivo >= nLI && netoObjetivo <= nLS) {
      let b = r2((netoObjetivo + t.cf - t.li * t.pct) / (1 - t.pct));
      // ajuste fino por redondeo a centavos
      for (let k = 0; k < 5 && Math.abs(neto(b) - netoObjetivo) > 0.005; k++) b = r2(b + Math.sign(netoObjetivo - neto(b)) * 0.01);
      const diff = r2(neto(b) - netoObjetivo);
      if (Math.abs(diff) <= tol) return { bruto: b, metodo: 'analytic', iteraciones: 1, diff };
    }
  }
  const maxPct = Math.max(...tarifa.map(t => t.pct));
  let lo = netoObjetivo, hi = netoObjetivo / (1 - maxPct), it = 0;
  while (it++ < prm.motor.max_iteraciones) {
    const mid = (lo + hi) / 2, n = neto(mid);
    if (Math.abs(n - netoObjetivo) <= tol) return { bruto: r2(mid), metodo: 'bisection', iteraciones: it, diff: r2(n - netoObjetivo) };
    n < netoObjetivo ? (lo = mid) : (hi = mid);
  }
  throw new PayrollError('NO_CONVERGENCE', `Sin convergencia para neto ${netoObjetivo}`);
}

// ---------- SDI / IMSS ----------
export function aniosAntiguedad(fecha_ingreso: string, corte: string): number {
  const a = new Date(fecha_ingreso), b = new Date(corte);
  let y = b.getUTCFullYear() - a.getUTCFullYear();
  if (b.getUTCMonth() < a.getUTCMonth() || (b.getUTCMonth() === a.getUTCMonth() && b.getUTCDate() < a.getUTCDate())) y--;
  return Math.max(0, y);
}
export function diasVacaciones(anios: number, prm: FiscalParamSet): number {
  const t = prm.lft.vacaciones; const idx = Math.min(Math.max(anios, 1), t.length) - 1; return t[idx];
}
export function factorIntegracion(anios: number, prm: FiscalParamSet): number {
  return 1 + (prm.lft.dias_aguinaldo + diasVacaciones(anios, prm) * prm.lft.prima_vacacional) / 365;
}

export function tasaCyvPatron(sbc: number, prm: FiscalParamSet): number {
  const sm = prm.salario_minimo_general, uma = prm.uma_diaria;
  const rows = prm.imss.cesantia_vejez_patron;
  if (sbc <= sm * rows[0].hasta!) return rows[0].pct;
  const v = sbc / uma;
  for (const r of rows.slice(1)) if (v > r.desde && (r.hasta === null || v <= r.hasta)) return r.pct;
  // hueco entre 1 SM y primer rango UMA (SM > 1.5 UMA): toma el primer rango cuyo límite superior supere v
  const next = rows.slice(1).find(r => r.hasta === null || v <= r.hasta); return next ? next.pct : rows[rows.length - 1].pct;
}

export function cuotasImss(sbc: number, dias: number, prm: FiscalParamSet) {
  const i = prm.imss, uma = prm.uma_diaria, exc = Math.max(0, sbc - 3 * uma);
  const o: Record<string, number> = {}, p: Record<string, number> = {};
  p.enf_mat_cuota_fija = uma * i.enf_mat_cuota_fija_pct_uma.patron * dias;
  p.enf_mat_excedente = exc * i.enf_mat_excedente_3uma.patron * dias; o.enf_mat_excedente = exc * i.enf_mat_excedente_3uma.obrero * dias;
  p.prestaciones_dinero = sbc * i.prestaciones_dinero.patron * dias; o.prestaciones_dinero = sbc * i.prestaciones_dinero.obrero * dias;
  p.gastos_medicos_pensionados = sbc * i.gastos_medicos_pensionados.patron * dias; o.gastos_medicos_pensionados = sbc * i.gastos_medicos_pensionados.obrero * dias;
  p.invalidez_vida = sbc * i.invalidez_vida.patron * dias; o.invalidez_vida = sbc * i.invalidez_vida.obrero * dias;
  p.guarderias = sbc * i.guarderias.patron * dias;
  p.riesgo_trabajo = sbc * prm.empresa.prima_riesgo_trabajo * dias;
  const sar = sbc * i.retiro_sar.patron * dias, cyv = sbc * tasaCyvPatron(sbc, prm) * dias, infonavit = sbc * i.infonavit.patron * dias;
  o.cesantia_vejez = sbc * i.cesantia_vejez_obrero * dias;
  if (i.exencion_obrero_salario_minimo && sbc <= prm.salario_minimo_general) for (const k in o) o[k] = 0;
  for (const k in o) o[k] = r2(o[k]); for (const k in p) p[k] = r2(p[k]);
  const sum = (m: Record<string, number>) => r2(Object.values(m).reduce((a, b) => a + b, 0));
  return { obrero: o, obrero_total: sum(o), patron: p, patron_total: sum(p), sar: r2(sar), cyv: r2(cyv), infonavit: r2(infonavit) };
}

// ---------- Validación ----------
export function validar(emp: EmpleadoInput, p: Periodo, prm: FiscalParamSet): Warning[] {
  const w: Warning[] = [];
  const esq = emp.esquema ?? 'mixto';
  if (!(emp.sueldo_diario_fiscal > 0)) w.push({ codigo: 'SUELDO_DIARIO_INVALIDO', mensaje: 'Sueldo diario debe ser > 0', valor: emp.sueldo_diario_fiscal });
  const sm = emp.zona_frontera ? prm.salario_minimo_frontera : prm.salario_minimo_general;
  if (esq !== 'asimilables' && emp.sueldo_diario_fiscal > 0 && emp.sueldo_diario_fiscal < sm) w.push({ codigo: 'SUELDO_DIARIO_MENOR_SM', mensaje: `Sueldo diario menor al salario mínimo ${sm}`, valor: emp.sueldo_diario_fiscal });
  if (emp.neto_pactado < 0) w.push({ codigo: 'VALOR_NEGATIVO', mensaje: 'Neto pactado negativo', valor: emp.neto_pactado });
  if (esq === 'mixto' && !(emp.neto_pactado > 0)) w.push({ codigo: 'NETO_PACTADO_INVALIDO', mensaje: 'Neto pactado requerido para esquema mixto', valor: emp.neto_pactado });
  if (p.fecha_fin < prm.vigencia_desde || p.fecha_fin > prm.vigencia_hasta) w.push({ codigo: 'TABLA_VENCIDA', mensaje: `Parámetros ${prm.ejercicio} v${prm.version} fuera de vigencia para ${p.fecha_fin}` });
  if (!prm.isr?.quincenal?.length || !prm.isr?.mensual?.length || !prm.uma_diaria) w.push({ codigo: 'PARAMS_FALTANTES', mensaje: 'Faltan tarifas ISR o UMA' });
  return w;
}

// ---------- Orquestación ----------
function nominaVacia(dias: number): NominaFiscal {
  return { dias_pagados: dias, sueldo_diario: 0, bruto_fiscal: 0, dias_sueldo: dias, sueldo: 0, dias_vacaciones: 0, vacaciones: 0, prima_vacacional: 0, prima_exenta: 0, prima_gravada: 0, extras_fiscal: 0, domingos: 0, prima_dominical: 0, prima_dominical_exenta: 0, festivos: 0, pago_festivos: 0, festivos_exento: 0, base_gravada: 0, isr_tarifa: 0, subsidio: 0, isr_nomina: 0, subsidio_entregado: 0, sdi: 0, sdi_fuente: 'calculado', factor_integracion: 0, sbc: 0, imss_obrero: 0, imss_obrero_detalle: {}, otras_deducciones: 0, descuentos_detalle: {}, neto_fiscal_sin_descuentos: 0, neto_fiscal: 0 };
}
export function calcularNominaFiscal(emp: EmpleadoInput, p: Periodo, prm: FiscalParamSet): NominaFiscal {
  const dias = diasPagados(emp, p, prm);
  if ((emp.esquema ?? 'mixto') === 'asimilables') return { ...nominaVacia(dias), sueldo_diario: emp.sueldo_diario_fiscal };
  const dv = Math.min(Math.max(0, emp.dias_vacaciones ?? 0), dias), ds = dias - dv;
  const sueldo = r2(emp.sueldo_diario_fiscal * ds), vacaciones = r2(emp.sueldo_diario_fiscal * dv);
  const prima = r2(vacaciones * prm.lft.prima_vacacional);
  const exentaTope = r2((prm.lft.prima_vacacional_exenta_umas ?? 15) * prm.uma_diaria);
  const primaEx = Math.min(prima, exentaTope), primaGr = r2(prima - primaEx);
  const dom = Math.max(0, emp.domingos_trabajados ?? 0), fest = Math.max(0, emp.festivos_trabajados ?? 0);
  const primaDom = r2(emp.sueldo_diario_fiscal * dom * (prm.lft.prima_dominical ?? 0.25));
  const primaDomEx = Math.min(primaDom, r2(dom * (prm.lft.prima_dominical_exenta_umas ?? 1) * prm.uma_diaria));
  const pagoFest = r2(emp.sueldo_diario_fiscal * fest * (prm.lft.festivo_extra_pct ?? 2));
  const festEx = Math.min(r2(pagoFest * (prm.lft.festivo_exento_pct ?? 0.5)), r2((prm.lft.festivo_exento_umas_semana ?? 5) * prm.uma_diaria * dias / 7));
  const extrasF = r2(Math.max(0, emp.extras?.fiscal ?? 0));
  const bruto = r2(sueldo + vacaciones + prima + primaDom + pagoFest + extrasF), baseIsr = r2(bruto - primaEx - primaDomEx - festEx);
  const diasBase = emp.tipo_calculo === 'mensual_fijo' ? prm.motor.dias_mes_fijo : emp.tipo_calculo === 'quincenal_fijo' ? prm.motor.dias_quincena_fija : dias;
  const tarifa = tarifaISR(p, diasBase, prm);
  const isrT = isr(baseIsr, tarifa);
  const sub = emp.overrides?.subsidio !== undefined ? r2(emp.overrides.subsidio) : subsidio(baseIsr, diasBase, prm);
  let isrN = Math.max(0, r2(isrT - sub)), subEnt = Math.max(0, r2(sub - isrT));
  if (emp.overrides?.isr_nomina !== undefined) { isrN = r2(emp.overrides.isr_nomina); subEnt = 0; }
  const factor = factorIntegracion(aniosAntiguedad(emp.fecha_ingreso, p.fecha_fin), prm);
  const sdiReg = emp.sdi_override && emp.sdi_override > 0 ? r2(emp.sdi_override) : null;
  const sdi = sdiReg ?? r2(emp.sueldo_diario_fiscal * factor);
  const sbc = Math.min(sdi, r2(prm.tope_cotizacion_umas * prm.uma_diaria));
  const q = cuotasImss(sbc, dias, prm);
  if (emp.overrides?.imss_obrero !== undefined) { q.obrero_total = r2(emp.overrides.imss_obrero); q.obrero = { oficial_layout: q.obrero_total }; }
  const det: Record<string, number> = {}; for (const [k, v] of Object.entries(emp.descuentos ?? {})) if (v && v > 0) det[k] = r2(v);
  if (emp.otras_deducciones) det.otros = r2((det.otros ?? 0) + emp.otras_deducciones);
  const otras = r2(Object.values(det).reduce((a, b) => a + b, 0));
  const netoSin = r2(bruto - isrN + subEnt - q.obrero_total);
  return { dias_pagados: dias, sueldo_diario: emp.sueldo_diario_fiscal, bruto_fiscal: bruto, dias_sueldo: ds, sueldo, dias_vacaciones: dv, vacaciones, prima_vacacional: prima, prima_exenta: primaEx, prima_gravada: primaGr, extras_fiscal: extrasF, domingos: dom, prima_dominical: primaDom, prima_dominical_exenta: primaDomEx, festivos: fest, pago_festivos: pagoFest, festivos_exento: festEx, base_gravada: baseIsr, isr_tarifa: isrT, subsidio: sub, isr_nomina: isrN,
    subsidio_entregado: subEnt, sdi, sdi_fuente: sdiReg ? 'registrado' : 'calculado', factor_integracion: Math.round(factor * 10000) / 10000, sbc, imss_obrero: q.obrero_total, imss_obrero_detalle: q.obrero, otras_deducciones: otras, descuentos_detalle: det, neto_fiscal_sin_descuentos: netoSin,
    neto_fiscal: r2(netoSin - otras) };
}

export function calcularAsimilables(netoObjetivo: number, p: Periodo, dias: number, prm: FiscalParamSet, netoPactadoDias = 0, extrasPactado = 0, extrasNeto = 0): Asimilables {
  const tarifa = (prm.asimilables_tarifa ?? 'mensual') === 'mensual' ? prm.isr.mensual : tarifaISR(p, dias, prm);
  const s = brutoDesdeNeto(Math.max(0, netoObjetivo), tarifa, prm);
  const i = isr(s.bruto, tarifa);
  return { neto_objetivo: r2(netoObjetivo), neto_pactado_dias: r2(netoPactadoDias), extras_pactado: r2(extrasPactado), extras_neto: r2(extrasNeto), bruto: s.bruto, isr: i, neto: r2(s.bruto - i), metodo: s.metodo, iteraciones: s.iteraciones, diff: s.diff };
}

export function comisionAsimilables(a: Asimilables, prm: FiscalParamSet) {
  const c = prm.asimilables_comision; if (!c || !(a.neto > 0)) return { comision: 0, iva: 0 };
  const comision = r2(a.neto * c.pct); return { comision, iva: r2(comision * c.iva_pct) };
}
export function calcularCargasPatronales(emp: EmpleadoInput, n: NominaFiscal, a: Asimilables, p: Periodo, prm: FiscalParamSet): CargasPatronales {
  const { comision, iva } = comisionAsimilables(a, prm);
  if ((emp.esquema ?? 'mixto') === 'asimilables') {
    const isn = r2((prm.isn.incluye_asimilables ? a.bruto : 0) * prm.isn.pct), otras = r2(emp.otras_cargas_periodo ?? 0);
    return { imss_patron: 0, imss_patron_detalle: {}, infonavit: 0, sar: 0, cesantia_vejez: 0, isn, comision_asimilables: comision, iva_comision: iva, prestaciones_periodo: 0, prestaciones_detalle: { aguinaldo: 0, prima_vacacional: 0, adicionales: 0 }, otras_cargas: otras, total: r2(isn + comision + iva + otras) };
  }
  const q = cuotasImss(n.sbc, n.dias_pagados, prm);
  const baseIsn = n.bruto_fiscal + (prm.isn.incluye_asimilables ? a.bruto : 0);
  const isn = r2(baseIsn * prm.isn.pct);
  const anios = aniosAntiguedad(emp.fecha_ingreso, p.fecha_fin);
  const prov: Record<string, number> = {
    aguinaldo: r2(emp.sueldo_diario_fiscal * prm.lft.dias_aguinaldo * n.dias_pagados / 365),
    prima_vacacional: n.prima_vacacional > 0 ? 0 : r2(emp.sueldo_diario_fiscal * diasVacaciones(anios, prm) * prm.lft.prima_vacacional * n.dias_pagados / 365),
    adicionales: r2(emp.prestaciones_adicionales_periodo ?? 0),
  };
  const prest = r2(Object.values(prov).reduce((x, y) => x + y, 0));
  const otras = r2(emp.otras_cargas_periodo ?? 0);
  const total = r2(q.patron_total + q.infonavit + q.sar + q.cyv + isn + comision + iva + prest + otras);
  return { imss_patron: q.patron_total, imss_patron_detalle: q.patron, infonavit: q.infonavit, sar: q.sar, cesantia_vejez: q.cyv, isn, comision_asimilables: comision, iva_comision: iva,
    prestaciones_periodo: prest, prestaciones_detalle: prov, otras_cargas: otras, total };
}

function esquemaTieneFiscal(emp: EmpleadoInput) { return (emp.esquema ?? 'mixto') !== 'asimilables'; }
export function calcularCostoReal(emp: EmpleadoInput, p: Periodo, prm: FiscalParamSet): ResultadoTrabajador {
  const warnings = validar(emp, p, prm);
  if (warnings.some(w => ['SUELDO_DIARIO_INVALIDO', 'NETO_PACTADO_INVALIDO', 'PARAMS_FALTANTES', 'VALOR_NEGATIVO'].includes(w.codigo)))
    throw new PayrollError(warnings[0].codigo, warnings[0].mensaje);
  const esquema = emp.esquema ?? 'mixto';
  const nomina = calcularNominaFiscal(emp, p, prm);
  if (emp.overrides && (emp.esquema ?? 'mixto') !== 'asimilables') {
    const propio = calcularNominaFiscal({ ...emp, overrides: undefined }, p, prm);
    for (const [k, ov, calc] of [['ISR', emp.overrides.isr_nomina, propio.isr_nomina], ['IMSS', emp.overrides.imss_obrero, propio.imss_obrero], ['SUBSIDIO', emp.overrides.subsidio, propio.subsidio]] as [string, number | undefined, number][]) {
      if (ov !== undefined && Math.abs(r2(ov - calc)) > 0.01) warnings.push({ codigo: `AJUSTE_${k}_LAYOUT`, mensaje: `${k} oficial ${ov.toFixed(2)} vs calculado ${calc.toFixed(2)}`, valor: r2(ov - calc) });
    }
  }
  // Neto objetivo del trabajador:
  //  mixto: sueldo diario pactado (neto pactado / días base) × días pagados + extras sobre SD pactado
  //  asimilables: sueldo diario libre × días trabajados + extras sobre SD libre
  const diasBase = emp.tipo_calculo === 'mensual_fijo' ? prm.motor.dias_mes_fijo : emp.tipo_calculo === 'quincenal_fijo' ? prm.motor.dias_quincena_fija : nomina.dias_pagados;
  const sdPactado = esquema === 'asimilables' ? emp.sueldo_diario_fiscal : (diasBase ? emp.neto_pactado / diasBase : 0);
  const netoPactadoDias = r2(sdPactado * nomina.dias_pagados);
  const extrasPactado = r2(sdPactado * ((nomina.dias_vacaciones * prm.lft.prima_vacacional) + (nomina.domingos * (prm.lft.prima_dominical ?? 0.25)) + (nomina.festivos * (prm.lft.festivo_extra_pct ?? 2))));
  const extrasNeto = r2(Math.max(0, emp.extras?.asimilables ?? 0));
  // El extra fiscal es adicional al pactado: se mide su efecto neto y no lo absorbe el cálculo inverso
  const netoBaseSinExtra = (emp.extras?.fiscal ?? 0) > 0 && esquema === 'mixto' ? calcularNominaFiscal({ ...emp, extras: { ...emp.extras, fiscal: 0 } }, p, prm).neto_fiscal_sin_descuentos : nomina.neto_fiscal_sin_descuentos;
  const extraFiscalNeto = r2(nomina.neto_fiscal_sin_descuentos - netoBaseSinExtra);
  if (esquema === 'fiscal' && extrasNeto > 0) warnings.push({ codigo: 'EXTRA_ASIMILABLES_EN_FISCAL', mensaje: 'Pago extra a asimilables ignorado: el trabajador es esquema fiscal', valor: extrasNeto });
  const netoObjetivoAsim = r2(netoPactadoDias + extrasPactado + (esquema === 'fiscal' ? 0 : extrasNeto));
  const faltante = esquema === 'fiscal' ? 0 : r2(netoObjetivoAsim - netoBaseSinExtra);
  if (esquema === 'mixto' && faltante < 0) warnings.push({ codigo: 'NETO_MENOR_A_FISCAL', mensaje: 'El neto pactado es menor al neto de nómina fiscal; asimilables = 0', valor: faltante });
  let asimilables = calcularAsimilables(faltante, p, nomina.dias_pagados, prm, esquema === 'fiscal' ? 0 : netoPactadoDias, esquema === 'fiscal' ? 0 : extrasPactado, esquema === 'fiscal' ? 0 : extrasNeto);
  if (emp.overrides?.asimilables && esquema !== 'fiscal') {
    const ov = emp.overrides.asimilables;
    if (Math.abs(r2(ov.bruto - asimilables.bruto)) > 0.01 || Math.abs(r2(ov.isr - asimilables.isr)) > 0.01)
      warnings.push({ codigo: 'AJUSTE_ASIMILABLES_LAYOUT', mensaje: `Asimilables oficiales bruto ${ov.bruto.toFixed(2)} / ISR ${ov.isr.toFixed(2)} vs calculados ${asimilables.bruto.toFixed(2)} / ${asimilables.isr.toFixed(2)}`, valor: r2(ov.bruto - asimilables.bruto) });
    asimilables = { ...asimilables, bruto: r2(ov.bruto), isr: r2(ov.isr), neto: r2(ov.bruto - ov.isr), metodo: 'layout', iteraciones: 0, diff: 0 };
  }
  const cargas = calcularCargasPatronales(emp, nomina, asimilables, p, prm);
  const neto_total = r2(nomina.neto_fiscal + asimilables.neto);
  const neto_pactado = esquema === 'fiscal' ? neto_total : r2(netoObjetivoAsim + extraFiscalNeto - nomina.otras_deducciones);
  const diferencia = r2(neto_total - neto_pactado);
  if (Math.abs(diferencia) > prm.motor.tolerancia && faltante >= 0) warnings.push({ codigo: 'DIFERENCIA_RESIDUAL', mensaje: 'Diferencia fuera de tolerancia', valor: diferencia });
  const costo = r2(nomina.bruto_fiscal + asimilables.bruto + cargas.total);
  const carga = r2(costo - neto_total);
  return { periodo: p, esquema, nomina, asimilables, cargas, neto_total, neto_pactado, diferencia, costo_real_total: costo, carga_laboral: carga,
    pct_carga_sobre_neto: neto_total ? r2(carga / neto_total * 100) : 0, pct_carga_sobre_costo: costo ? r2(carga / costo * 100) : 0,
    relacion_costo_neto: neto_total ? Math.round(costo / neto_total * 10000) / 10000 : 0, warnings };
}

/** Incremento: corre el motor con dos netos y devuelve deltas. */
export function simularIncremento(emp: EmpleadoInput, netoNuevo: number, p: Periodo, prm: FiscalParamSet, periodosAnio = 12) {
  const a = calcularCostoReal(emp, p, prm), b = calcularCostoReal({ ...emp, neto_pactado: netoNuevo }, p, prm);
  const d = (x: number, y: number) => r2(y - x);
  const dCosto = d(a.costo_real_total, b.costo_real_total);
  return { actual: a, nuevo: b, incremento_neto: d(a.neto_total, b.neto_total), incremento_fiscal: d(a.nomina.bruto_fiscal, b.nomina.bruto_fiscal),
    incremento_asimilables: d(a.asimilables.bruto, b.asimilables.bruto), incremento_cargas: d(a.cargas.total, b.cargas.total),
    incremento_costo_periodo: dCosto, incremento_costo_anual: r2(dCosto * periodosAnio), pct_incremento_presupuestal: r2(dCosto / a.costo_real_total * 100) };
}
