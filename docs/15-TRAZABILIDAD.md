# 15. Trazabilidad (pantalla → BD)

**Calcular nómina**
/nomina (`app/nomina/ui.tsx` botón Calcular) → action `calcularPeriodo` (`lib/actions.ts`) → `paramsVigentes` (`lib/params.ts`) + `db.pagoExtra.findMany` → por trabajador `calcularCostoReal` (`engine/index.ts`) → `db.payrollPeriod.upsert` + `db.payrollCalculation.create` → render `ResultadoTrabajador.tsx`. Tablas: FiscalParamSet(R), PagoExtra(R), PayrollPeriod(W), PayrollCalculation(W).

**Preparar días**
/nomina (Preparar) → `prepararPeriodo` → `diasDelPeriodo` (`lib/dias.ts`) → `leerAsistencia/leerIncidencias/leerFestivos` (`lib/asistencias.ts`, BD remota) + `codigosCfg/reglaSinMarca` (AppSetting) → tabla editable → `guardarBorradorDias` → AppSetting(W `borrador_dias:*`).

**Ajustar con layout**
/nomina (archivo + botón) → `leerLayoutOficial` (parsea Excel, cruza RFC/número con Employee) → `calcularPeriodo(..., overrides)` → engine aplica overrides + warnings AJUSTE_* → PayrollCalculation(W, inputSnapshot.ajuste_layout=true).

**Guardar trabajador**
/empleados (form) → `guardarEmpleado` → normaliza números/fechas → `db.puesto.upsert?` + `db.employee.create/update` → revalidate → tabla.

**Importar histórica**
/historial/importar (`ui.tsx`) → hojas leídas en el navegador (xlsx) → `importarNominaHistorica` → agrupa por RFC → arma `result` compatible con ResultadoTrabajador → PayrollPeriod(upsert estado importado) + PayrollCalculation(create, warning IMPORTADO).

**Reportes de periodo**
/historial/[periodId] → `db.payrollCalculation.findMany(distinct employeeId, desc)` → `ReportesNomina.tsx` (pestañas, `acumular()`, exportación XLSX en cliente).

**SDI**
/sdi → `paramsVigentes(fecha)` + `db.employee.findMany` → `aniosAntiguedad/diasVacaciones/factorIntegracion` (engine) → tabla + Excel. Sin escritura.

**Parámetros**
/configuracion-fiscal/editar (`ui.tsx` editor JSON estructurado) → `guardarVersionParams` → `hashParams` (`lib/params.ts`) → FiscalParamSet(W) → `activarParamSet` → estados vigente/vencido.

**Sincronización**
/asistencias → `sincronizarCatalogos`/`sincronizarEmpleados` (`lib/sync.ts`) → `leerEmpleados/leerCatalogos` (remota) → CostCenter/Employee (upsert por numeroEmpleado).

**Dashboard**
/ → `idsDeVista` (filtra PayrollPeriod por vista/mes/año) → `resumenPeriodos` (agrega result JSON) → Scenario (presupuesto) + AppSetting (semáforo).
