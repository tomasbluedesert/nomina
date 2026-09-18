# 7. Diccionario de datos (campos relevantes)
Origen: `prisma/schema.prisma`. Ob = obligatorio.

| Tabla | Campo | Tipo | Ob | Descripción / uso |
|---|---|---|---|---|
| Company | rfc | String @unique | ✓ | Identificador fiscal de la empresa |
| Company | primaRiesgo | Decimal(7,5) | ✓ | Prima de riesgo de trabajo (IMSS patrón); entra a `cuotasImss` |
| Company | estadoIsn | String ("BCS") | ✓ | Estado para tasa ISN (3% BCS en parámetros) |
| Employee | numeroEmpleado | String | ✓ | Clave operativa; llave de upsert en carga masiva y sync (@@unique con companyId) |
| Employee | rfc | String | ✓ | Llave de cruce del importador histórico y layout (@@unique con companyId) |
| Employee | fechaIngreso | Date | ✓ | Antigüedad → vacaciones LFT → factor de integración |
| Employee | esquema | enum fiscal\|mixto\|asimilables | ✓ | Decide el flujo de cálculo (ver doc 08) |
| Employee | sueldoDiarioFiscal | Decimal(12,2) | ✓ | SD fiscal; en asimilables puros = SD libre |
| Employee | netoPactado | Decimal(12,2) | ✓ | Neto acordado por periodo (mixto); proporcional a días pagados |
| Employee | periodicidad | enum quincenal\|mensual | ✓ | Qué corrida lo incluye |
| Employee | tipoCalculo | enum quincenal_fijo\|mensual_fijo\|diario_x_dias | ✓ | Base de días (15/30/calendario) |
| Employee | sdiRegistrado | Decimal? | — | Si existe, sustituye al SDI calculado (IMSS/SBC) |
| Employee | descInfonavit/Fonacot/Prestamo/Pension | Decimal(12,2)=0 | — | Descuentos fijos por periodo; se restan del neto; asimilables no los compensan |
| Employee | asistenciasId | String? | — | id del empleado en la BD de asistencias (vincula sync y días) |
| FiscalParamSet | data | Json | ✓ | FiscalParamSet completo (uma_diaria, salario_minimo_general, isr.{quincenal,mensual}, subsidio{monto_mensual,monto_quincenal,limite}, imss (ramos), cyv_transitoria, prima_riesgo default, isn, lft{aguinaldo,prima_vacacional,vacaciones[],exenciones,prima_dominical,festivo_*}, asimilables_comision, asimilables_tarifa, motor{dias_quincena_fija,dias_mes_fijo}) |
| FiscalParamSet | hashSha256 | String | ✓ | Hash del JSON; se copia a cada cálculo (integridad) |
| FiscalParamSet | vigenciaDesde/Hasta, estado | Date, enum | ✓ | Selección de versión por fecha (`paramsVigentes`) |
| PayrollPeriod | tipo, fechaInicio, fechaFin | enum, Date | ✓ | Identifican el periodo (@@unique) |
| PayrollPeriod | estado | String | ✓ | abierto \| importado |
| PayrollCalculation | inputSnapshot | Json | ✓ | EmpleadoInput usado + fuente de días + bandera ajuste_layout |
| PayrollCalculation | result | Json | ✓ | ResultadoTrabajador completo (nomina, asimilables, cargas, indicadores, warnings) |
| PayrollCalculation | calculatedBy | String? | — | Correo del usuario autenticado |
| PagoExtra | destino | String | ✓ | fiscal (bruto gravable) \| asimilables (neto) |
| Scenario | presupuestoObjetivo | Decimal(14,2)? | — | Presupuesto MENSUAL (dashboard compara mitad por quincena) |
| AppSetting | key/value | String | ✓ | codigosCfg (JSON), reglaSinMarca, borrador_dias:<ini>:<fin> (JSON con claves empleado, vac:, dom:, fest:), semaforo_amarillo_pct, semaforo_rojo_pct |

Contratos TypeScript equivalentes (EmpleadoInput, NominaFiscal, Asimilables, CargasPatronales, ResultadoTrabajador): `packages/payroll-engine/src/types.ts` — es la referencia campo a campo del JSON `result`.
