import { describe, it, expect } from 'vitest';
import prm from '../seed/params-2026.json';
import { isr, brutoDesdeNeto, calcularCostoReal, tasaCyvPatron, factorIntegracion, type FiscalParamSet, type Periodo } from '../src/index';
const P = prm as unknown as FiscalParamSet;
const Q: Periodo = { tipo: 'quincenal', fecha_inicio: '2026-08-01', fecha_fin: '2026-08-15' };
const M: Periodo = { tipo: 'mensual', fecha_inicio: '2026-03-01', fecha_fin: '2026-03-31' };

describe('ISR tarifa', () => {
  it('límites de tramo quincenal', () => {
    expect(isr(416.70, P.isr.quincenal)).toBeCloseTo(8.00, 2);
    expect(isr(416.71, P.isr.quincenal)).toBeCloseTo(7.95, 2);
    expect(isr(0, P.isr.quincenal)).toBe(0);
    expect(isr(300000, P.isr.quincenal)).toBeCloseTo(65866.05 + (300000-210020.71)*0.35, 1);
  });
});

describe('Inverso', () => {
  it('propiedad: |neto(bruto(n)) - n| ≤ 0.01 en 2000 casos', () => {
    let seed = 42; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const tarifa of [P.isr.quincenal, P.isr.mensual]) for (let i = 0; i < 1000; i++) {
      const n = Math.round(rnd() * 50000000) / 100;
      const { bruto } = brutoDesdeNeto(n, tarifa, P);
      expect(Math.abs((bruto - isr(bruto, tarifa)) - n)).toBeLessThanOrEqual(0.01);
    }
  });
  it('fronteras y cero', () => {
    for (const t of P.isr.mensual) { const n = t.li - isr(t.li, P.isr.mensual); const { bruto } = brutoDesdeNeto(n, P.isr.mensual, P); expect(Math.abs(bruto - isr(bruto, P.isr.mensual) - n)).toBeLessThanOrEqual(0.01); }
    expect(brutoDesdeNeto(0, P.isr.mensual, P).bruto).toBe(0);
  });
});

describe('IMSS', () => {
  it('CyV por rango', () => {
    expect(tasaCyvPatron(315.04, P)).toBe(0.03150);
    expect(tasaCyvPatron(400, P)).toBe(0.06361);   // 3.41 UMA
    expect(tasaCyvPatron(1000, P)).toBe(0.07513);
  });
  it('factor integración año 1', () => expect(factorIntegracion(1, P)).toBeCloseTo(1.0493, 4));
});

describe('Integración — neto final = pactado', () => {
  const casos = [
    { emp: { sueldo_diario_fiscal: 1026.33, neto_pactado: 25000, tipo_calculo: 'quincenal_fijo' as const, fecha_ingreso: '2022-05-10' }, p: Q },
    { emp: { sueldo_diario_fiscal: 500, neto_pactado: 50000, tipo_calculo: 'diario_x_dias' as const, fecha_ingreso: '2025-11-01' }, p: M },
    { emp: { sueldo_diario_fiscal: 2000, neto_pactado: 35000, tipo_calculo: 'mensual_fijo' as const, fecha_ingreso: '2018-01-15' }, p: M },
  ];
  for (const [i, c] of casos.entries()) it(`caso ${i+1}`, () => {
    const r = calcularCostoReal(c.emp, c.p, P);
    if (i < 2) expect(Math.abs(r.diferencia)).toBeLessThanOrEqual(0.01);
    expect(r.costo_real_total).toBeCloseTo(r.nomina.bruto_fiscal + r.asimilables.bruto + r.cargas.total, 2);
    if (i === 2) { expect(r.asimilables.bruto).toBe(0); expect(r.warnings.map(w => w.codigo)).toContain('NETO_MENOR_A_FISCAL'); }
  });
  it('esquema fiscal: sin asimilables, neto = neto fiscal', () => {
    const r = calcularCostoReal({ sueldo_diario_fiscal: 1026.33, neto_pactado: 0, esquema: 'fiscal', tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2022-05-10' }, Q, P);
    expect(r.asimilables.bruto).toBe(0); expect(r.neto_total).toBe(r.nomina.neto_fiscal); expect(r.diferencia).toBe(0); expect(r.cargas.imss_patron).toBeGreaterThan(0);
  });
  it('esquema asimilables: SD libre 750 × 10 días = 7,500 netos, sin IMSS', () => {
    const r = calcularCostoReal({ sueldo_diario_fiscal: 750, neto_pactado: 0, esquema: 'asimilables', tipo_calculo: 'diario_x_dias', fecha_ingreso: '2024-01-01' }, { tipo: 'quincenal', fecha_inicio: '2026-08-01', fecha_fin: '2026-08-10' }, P);
    expect(r.nomina.dias_pagados).toBe(10); expect(r.neto_pactado).toBe(7500); expect(r.neto_total).toBeCloseTo(7500, 2);
    expect(r.nomina.bruto_fiscal).toBe(0); expect(r.cargas.imss_patron).toBe(0); expect(r.cargas.prestaciones_periodo).toBe(0);
    expect(Math.abs(r.diferencia)).toBeLessThanOrEqual(0.01); expect(r.costo_real_total).toBeCloseTo(r.asimilables.bruto + r.cargas.total, 2);
  });
  it('febrero 28 días diario_x_dias', () => {
    const r = calcularCostoReal({ sueldo_diario_fiscal: 500, neto_pactado: 20000, tipo_calculo: 'diario_x_dias', fecha_ingreso: '2025-01-01' }, { tipo: 'mensual', fecha_inicio: '2026-02-01', fecha_fin: '2026-02-28' }, P);
    expect(r.nomina.dias_pagados).toBe(28); expect(r.nomina.bruto_fiscal).toBe(14000); expect(Math.abs(r.diferencia)).toBeLessThanOrEqual(0.01);
  });
  it('dias_override: quincenal fijo con 13 días pagados', () => {
    const r = calcularCostoReal({ sueldo_diario_fiscal: 1026.33, neto_pactado: 25000, tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2022-05-10', dias_override: 13 }, Q, P);
    expect(r.nomina.dias_pagados).toBe(13); expect(r.nomina.bruto_fiscal).toBeCloseTo(13342.29, 2); expect(Math.abs(r.diferencia)).toBeLessThanOrEqual(0.01);
  });
  it('comisión asimilables 5% + IVA 16% sobre neto depositado', () => {
    const r = calcularCostoReal({ sueldo_diario_fiscal: 750, neto_pactado: 0, esquema: 'asimilables', tipo_calculo: 'diario_x_dias', fecha_ingreso: '2024-01-01' }, { tipo: 'quincenal', fecha_inicio: '2026-08-01', fecha_fin: '2026-08-10' }, P);
    expect(r.cargas.comision_asimilables).toBeCloseTo(375, 2); expect(r.cargas.iva_comision).toBeCloseTo(60, 2); expect(r.cargas.total).toBeCloseTo(435, 2);
    expect(r.costo_real_total).toBeCloseTo(r.asimilables.bruto + 435, 2);
  });
  it('vacaciones: 5 días V se separan del sueldo y pagan prima 25%', () => {
    const r = calcularCostoReal({ sueldo_diario_fiscal: 1000, neto_pactado: 25000, tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2022-05-10', dias_vacaciones: 5 }, Q, P);
    const n = r.nomina; expect(n.dias_sueldo).toBe(10); expect(n.sueldo).toBe(10000); expect(n.vacaciones).toBe(5000); expect(n.prima_vacacional).toBe(1250);
    expect(n.prima_exenta).toBe(1250); expect(n.bruto_fiscal).toBe(16250); expect(r.cargas.prestaciones_detalle.prima_vacacional).toBe(0); expect(Math.abs(r.diferencia)).toBeLessThanOrEqual(0.01);
  });
  it('Excel de Tomás: SD 315.50, neto 20,000, 13 sueldo + 2 vac + 4 domingos → recibe 22,000', () => {
    const r = calcularCostoReal({ sueldo_diario_fiscal: 315.5, neto_pactado: 20000, tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2022-05-10', dias_override: 15, dias_vacaciones: 2, domingos_trabajados: 4 }, Q, P);
    const n = r.nomina; expect(n.sueldo).toBe(4101.5); expect(n.vacaciones).toBe(631); expect(n.prima_vacacional).toBe(157.75); expect(n.prima_dominical).toBe(315.5); expect(n.bruto_fiscal).toBe(5205.75);
    expect(r.asimilables.extras_pactado).toBeCloseTo(2000, 2); expect(r.neto_pactado).toBeCloseTo(22000, 2); expect(Math.abs(r.diferencia)).toBeLessThanOrEqual(0.01);
  });
  it('mixto con faltas: neto pactado proporcional (13 de 15 días)', () => {
    const r = calcularCostoReal({ sueldo_diario_fiscal: 1026.33, neto_pactado: 25000, tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2022-05-10', dias_override: 13 }, Q, P);
    expect(r.neto_pactado).toBeCloseTo(25000 * 13 / 15, 2); expect(Math.abs(r.diferencia)).toBeLessThanOrEqual(0.01);
  });
  it('descuentos fijos reducen el neto y no los compensan los asimilables', () => {
    const base = calcularCostoReal({ sueldo_diario_fiscal: 1026.33, neto_pactado: 25000, tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2022-05-10' }, Q, P);
    const r = calcularCostoReal({ sueldo_diario_fiscal: 1026.33, neto_pactado: 25000, tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2022-05-10', descuentos: { infonavit: 1500, pension: 3795.84 } }, Q, P);
    expect(r.nomina.otras_deducciones).toBe(5295.84); expect(r.asimilables.bruto).toBe(base.asimilables.bruto);
    expect(r.neto_total).toBeCloseTo(25000 - 5295.84, 2); expect(Math.abs(r.diferencia)).toBeLessThanOrEqual(0.01);
  });
  it('pagos extra: bono fiscal bruto 2,000 y bono asimilables neto 3,000', () => {
    const base = calcularCostoReal({ sueldo_diario_fiscal: 1026.33, neto_pactado: 25000, tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2022-05-10' }, Q, P);
    const r = calcularCostoReal({ sueldo_diario_fiscal: 1026.33, neto_pactado: 25000, tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2022-05-10', extras: { fiscal: 2000, asimilables: 3000 } }, Q, P);
    expect(r.nomina.bruto_fiscal).toBeCloseTo(base.nomina.bruto_fiscal + 2000, 2); expect(r.nomina.imss_obrero).toBe(base.nomina.imss_obrero);
    expect(r.asimilables.extras_neto).toBe(3000); expect(Math.abs(r.diferencia)).toBeLessThanOrEqual(0.01);
    const extraFiscalNeto = r.nomina.neto_fiscal - base.nomina.neto_fiscal; expect(extraFiscalNeto).toBeGreaterThan(1500);
    expect(r.neto_total).toBeCloseTo(base.neto_total + 3000 + extraFiscalNeto, 2); // ambos bonos son adicionales al pactado
  });
  it('sdi_override sustituye al SDI calculado', () => {
    const r = calcularCostoReal({ sueldo_diario_fiscal: 750, neto_pactado: 20000, tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2026-03-01', sdi_override: 786.97 }, Q, P);
    expect(r.nomina.sdi).toBe(786.97); expect(r.nomina.sdi_fuente).toBe('registrado'); expect(r.nomina.sbc).toBe(786.97);
  });
  it('conciliación nómina histórica enero: fiscal 5,250 → ISR 129.49; festivos 50% exentos → 107.51; asimilado mensual 26,226.42 → 3,713.62', () => {
    const t = P.isr.mensual;
    expect(Math.round((isr(26226.42, t)) * 100) / 100).toBeCloseTo(3713.62, 2);
    expect(Math.round((isr(9695.94, t)) * 100) / 100).toBeCloseTo(695.93, 1);
    const a = calcularCostoReal({ sueldo_diario_fiscal: 350, neto_pactado: 0, esquema: 'fiscal', tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2020-10-16', sdi_override: 369.66 }, Q, P);
    expect(a.nomina.isr_nomina).toBeCloseTo(129.49, 2);
    const b = calcularCostoReal({ sueldo_diario_fiscal: 315.5, neto_pactado: 0, esquema: 'fiscal', tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2020-06-16', sdi_override: 333.22, festivos_trabajados: 2 }, Q, P);
    expect(b.nomina.pago_festivos).toBeCloseTo(631, 2); expect(b.nomina.isr_nomina).toBeCloseTo(107.51, 2); expect(b.nomina.imss_obrero).toBeCloseTo(118.71, 2);
  });
  it('overrides de layout: ISR e IMSS oficiales sustituyen y el neto pactado se mantiene', () => {
    const r = calcularCostoReal({ sueldo_diario_fiscal: 1026.33, neto_pactado: 25000, tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2022-05-10', overrides: { isr_nomina: 1500, imss_obrero: 130 } }, Q, P);
    expect(r.nomina.isr_nomina).toBe(1500); expect(r.nomina.imss_obrero).toBe(130);
    expect(Math.abs(r.diferencia)).toBeLessThanOrEqual(0.01); expect(r.neto_total).toBeCloseTo(25000, 1);
    expect(r.warnings.some(w => w.codigo === 'AJUSTE_ISR_LAYOUT')).toBe(true);
  });
  it('override asimilables oficiales: bruto e ISR del layout sustituyen', () => {
    const r = calcularCostoReal({ sueldo_diario_fiscal: 1026.33, neto_pactado: 25000, tipo_calculo: 'quincenal_fijo', fecha_ingreso: '2022-05-10', overrides: { asimilables: { bruto: 15000, isr: 2500 } } }, Q, P);
    expect(r.asimilables.bruto).toBe(15000); expect(r.asimilables.isr).toBe(2500); expect(r.asimilables.neto).toBe(12500);
    expect(r.warnings.some(w => w.codigo === 'AJUSTE_ASIMILABLES_LAYOUT')).toBe(true);
  });
  it('tabla vencida genera warning', () => {
    const r = calcularCostoReal(casos[0].emp, { ...Q, fecha_inicio: '2027-01-01', fecha_fin: '2027-01-15' }, P);
    expect(r.warnings.map(w => w.codigo)).toContain('TABLA_VENCIDA');
  });
});
