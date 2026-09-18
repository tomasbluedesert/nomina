# 8. Reglas de negocio y cálculos
Fuente única: `packages/payroll-engine/src/index.ts` (funciones citadas) con parámetros de `FiscalParamSet.data`. Redondeo: `r2()` a 2 decimales en cada paso. 21 pruebas en `test/engine.spec.ts`, varias ancladas a la nómina real de enero 2026.

## Reglas de negocio (SI/ENTONCES)
| # | Regla | Implementación |
|---|---|---|
| N1 | El trabajador mixto recibe su **neto pactado** proporcional a días: SD pactado = netoPactado/díasBase; objetivo = SD pactado × días pagados | `calcularCostoReal` (netoPactadoDias) |
| N2 | Primas (vacacional 25%, dominical 25%, festivo trabajado) se calculan sobre el **SD pactado** y **se suman** al neto (no lo componen); la fiscal paga su parte sobre SD fiscal y asimilables completan | `calcularCostoReal` (extrasPactado) |
| N3 | Días V se separan del sueldo: renglón Vacaciones = SD×díasV + prima vacacional; ese periodo la provisión de prima = 0 (no duplicar costo) | `calcularNominaFiscal`, `calcularCargasPatronales` |
| N4 | Domingo trabajado (marca con flag `trabaja` en fecha domingo) → prima dominical 25%, exenta 1 UMA/domingo | `dias.ts` + engine |
| N5 | Festivo trabajado (tabla festivos o marca DF) → pago extra **100%** del SD (parámetro festivo_extra_pct=1.0), 50% exento con tope 5 UMA/semana | engine |
| N6 | Descuentos fijos (Infonavit/Fonacot/préstamo/pensión) se restan del neto final; el inverso de asimilables usa el neto fiscal SIN descuentos (no los compensa) | `calcularNominaFiscal` (neto_fiscal_sin_descuentos) + `calcularCostoReal` |
| N7 | Pago extra destino fiscal = bruto gravable sin IMSS; destino asimilables = neto (se invierte); ambos **adicionales** al pactado (el extra fiscal no es absorbido: se mide su efecto neto con una corrida sin extra) | `calcularCostoReal` |
| N8 | Si Employee.sdiRegistrado > 0, ese SDI sustituye al calculado (fuente 'registrado') | `calcularNominaFiscal` |
| N9 | ISR de asimilables con tarifa **MENSUAL siempre** (asimilables_tarifa='mensual'), criterio conciliado con la nómina pagada | `calcularAsimilables` |
| N10 | Subsidio: quincena fija usa `monto_quincenal` publicado (264.62); si ingreso > límite proporcional → 0; excedente de subsidio sobre ISR se entrega | `subsidio`, `calcularNominaFiscal` |
| N11 | Overrides de layout (isr_nomina, imss_obrero, subsidio, asimilables{bruto,isr}) sustituyen valores y generan warnings AJUSTE_*_LAYOUT con la diferencia; el neto pactado se respeta | engine |
| N12 | Esquema fiscal: sin asimilables (bono asimilable se ignora con aviso). Asimilables puro: SD libre × días = neto; sin IMSS ni prestaciones; primas dominical/festivo sobre SD libre; vacaciones no aplican | `calcularCostoReal`, `actions.ts` |
| N13 | Sin marca en asistencias = según `reglaSinMarca` (default no paga); códigos configurables paga/trabaja | `dias.ts` |
| N14 | Parámetros versionados: activar una versión vence las de vigencia traslapada; cada cálculo sella paramSetId+hash → históricos inmutables | `actions.ts`, `params.ts` |

## Cálculos y fórmulas (entradas → fórmula → resultado)
| Cálculo | Fórmula | Función |
|---|---|---|
| ISR | tarifa por tramos: cuotaFija + (base − límiteInf) × % | `isr` |
| Inverso asimilables | por tramo: bruto = (neto − cf + li·t)/(1−t); respaldo bisección; tolerancia $0.01 | `brutoDesdeNeto` |
| Factor de integración | 1 + (díasAguinaldo + díasVac(antigüedad)×primaVac)/365 | `factorIntegracion` |
| SDI / SBC | SDI = SD×factor (o sdiRegistrado); SBC = min(SDI, 25 UMA) | `calcularNominaFiscal` |
| IMSS por ramos | excedente 3 UMA, prestaciones dinero, GMP, invalidez, CyV (tasa patronal transitoria por nivel de SBC), guarderías, riesgo (primaRiesgo empresa), retiro; obrero y patrón por separado, × días | `cuotasImss`, `tasaCyvPatron` |
| Base gravada fiscal | bruto − prima vac exenta (≤15 UMA) − prima dom exenta (1 UMA/dom) − festivo exento (50%, tope 5 UMA/sem) | `calcularNominaFiscal` |
| Neto fiscal | bruto − ISR + subsidio entregado − IMSS obrero − descuentos | ídem |
| Asimilables | faltante = neto objetivo − neto fiscal sin descuentos → inverso → bruto, ISR, neto | `calcularAsimilables` |
| Comisión asimilables | neto asim × 5% + IVA 16% | `comisionAsimilables` |
| Cargas patronales | IMSS patrón + INFONAVIT 5% SBC + SAR 2% + ISN 3% (bruto fiscal) + provisiones (aguinaldo 15d, prima vac, proporcional a días/365) + comisión | `calcularCargasPatronales` |
| Costo real | bruto fiscal + bruto asimilables + cargas totales; indicadores: carga/neto, carga/costo, costo/neto | `calcularCostoReal` |
| Simulación | costo(neto nuevo) − costo(actual) | `simularIncremento` |

## Reglas técnicas
Server actions revalidan rutas (`revalidatePath`); periodos upsert por (empresa,inicio,fin); cálculos solo-insert; borradores de días en AppSetting con claves `vac:/dom:/fest:`; Excel se normaliza a claves snake_case sin acentos (importadores).
