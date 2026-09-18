import prm from '../seed/params-2026.json';
import { calcularCostoReal, simularIncremento, type FiscalParamSet } from '../src/index.js';
const P = prm as unknown as FiscalParamSet;
const f = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const casos = [
  { t: 'Ejemplo 1 — Quincenal, SD 1,026.33, neto 25,000', emp: { sueldo_diario_fiscal: 1026.33, neto_pactado: 25000, tipo_calculo: 'quincenal_fijo' as const, fecha_ingreso: '2022-05-10' }, p: { tipo: 'quincenal' as const, fecha_inicio: '2026-08-01', fecha_fin: '2026-08-15' } },
  { t: 'Ejemplo 2 — Mensual marzo (31 d), SD 500, neto 50,000', emp: { sueldo_diario_fiscal: 500, neto_pactado: 50000, tipo_calculo: 'diario_x_dias' as const, fecha_ingreso: '2025-11-01' }, p: { tipo: 'mensual' as const, fecha_inicio: '2026-03-01', fecha_fin: '2026-03-31' } },
  { t: 'Ejemplo 3 — Límite: SD 2,000 mensual fijo, neto 35,000 (< neto fiscal)', emp: { sueldo_diario_fiscal: 2000, neto_pactado: 35000, tipo_calculo: 'mensual_fijo' as const, fecha_ingreso: '2018-01-15' }, p: { tipo: 'mensual' as const, fecha_inicio: '2026-03-01', fecha_fin: '2026-03-31' } },
];
let out = '# Ejemplos numéricos — Parámetros 2026 v1\n\n';
for (const c of casos) {
  const r = calcularCostoReal(c.emp, c.p, P); const n = r.nomina, a = r.asimilables, g = r.cargas;
  const rows: [string, number][] = [
    ['Sueldo diario fiscal', n.sueldo_diario], ['Días pagados', n.dias_pagados], ['Sueldo bruto fiscal', n.bruto_fiscal],
    ['ISR tarifa', n.isr_tarifa], ['Subsidio', n.subsidio], ['ISR nómina', n.isr_nomina], ['SDI', n.sdi], ['SBC', n.sbc], ['IMSS trabajador', n.imss_obrero],
    ['Neto nómina fiscal', n.neto_fiscal], ['Neto faltante', a.neto_objetivo], ['Bruto asimilables', a.bruto], ['ISR asimilables', a.isr], ['Neto asimilables', a.neto],
    ['Neto total trabajador', r.neto_total], ['Sueldo neto pactado', r.neto_pactado], ['**Diferencia**', r.diferencia],
    ['IMSS patronal', g.imss_patron], ['INFONAVIT', g.infonavit], ['SAR', g.sar], ['Cesantía y vejez', g.cesantia_vejez], ['ISN 3%', g.isn],
    ['Provisión aguinaldo', g.prestaciones_detalle.aguinaldo], ['Provisión prima vacacional', g.prestaciones_detalle.prima_vacacional], ['Total cargas patronales', g.total],
    ['**Costo real total empresa**', r.costo_real_total], ['Carga laboral', r.carga_laboral], ['% carga / neto', r.pct_carga_sobre_neto], ['% carga / costo', r.pct_carga_sobre_costo], ['Relación costo/neto', r.relacion_costo_neto],
  ];
  out += `## ${c.t}\n\n| Concepto | Importe |\n|---|---:|\n` + rows.map(([k, v]) => `| ${k} | ${f(v)} |`).join('\n') + '\n';
  if (r.warnings.length) out += '\nWarnings: ' + r.warnings.map(w => `\`${w.codigo}\` ${w.mensaje}`).join('; ') + '\n';
  out += `\nMétodo inverso: ${a.metodo}, iteraciones ${a.iteraciones}\n\n`;
}
const inc = simularIncremento({ sueldo_diario_fiscal: 800, neto_pactado: 40000, tipo_calculo: 'mensual_fijo', fecha_ingreso: '2023-06-01' }, 45000, { tipo: 'mensual', fecha_inicio: '2026-08-01', fecha_fin: '2026-08-31' }, P);
out += `## Simulador de incremento — 40,000 → 45,000 netos mensuales (SD 800)\n\n| Indicador | Importe |\n|---|---:|\n| Incremento neto trabajador | ${f(inc.incremento_neto)} |\n| Incremento nómina fiscal | ${f(inc.incremento_fiscal)} |\n| Incremento asimilables | ${f(inc.incremento_asimilables)} |\n| Incremento cargas patronales | ${f(inc.incremento_cargas)} |\n| Incremento costo mensual empresa | ${f(inc.incremento_costo_periodo)} |\n| Incremento costo anual empresa | ${f(inc.incremento_costo_anual)} |\n| % real de incremento presupuestal | ${f(inc.pct_incremento_presupuestal)}% |\n| Costo real actual / nuevo | ${f(inc.actual.costo_real_total)} / ${f(inc.nuevo.costo_real_total)} |\n`;
process.stdout.write(out);
