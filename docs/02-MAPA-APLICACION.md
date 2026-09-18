# 2. Mapa general de la aplicación

Acceso: todas las rutas requieren sesión (middleware); quien puede entrar, puede usarlo todo (sin roles diferenciados — ver doc 09).

```text
Aplicación (layout: src/app/layout.tsx — barra de navegación + usuario + Salir)
├── /login                    Acceso (única ruta pública)
├── /                         Dashboard (vista Q1/Q2/Mensual + presupuesto)
├── /nomina                   Cálculo de nómina (2 pasos: Preparar días → Calcular; ajuste con layout)
├── /empleados                Expedientes de trabajadores (tabla + panel plegable alta/edición)
│   └── /empleados/importar   Carga masiva Excel (plantilla y descarga de actuales)
├── /centros-costos           Catálogos: departamentos, propiedades/centros, puestos
├── /asistencias              Conexión a BD de asistencias: sync catálogos/trabajadores, códigos
├── /historial                Periodos calculados/importados (eliminar periodo)
│   ├── /historial/importar   Importador de nóminas históricas (Excel de recibos)
│   ├── /historial/[periodId] Reportes del periodo (5 pestañas + Excel)
│   └── /historial/trabajador/[employeeId]  Acumulado y detalle por trabajador
├── /reporte-mensual          Reporte por departamento/centro con estructura acumulada
├── /sdi                      Salario diario integrado: factor, SDI calc. vs registrado, SBC
├── /presupuesto              Presupuesto mensual objetivo + escenario propuesto (líneas)
├── /configuracion-fiscal     Versiones de parámetros (vigencias, activar)
│   └── /configuracion-fiscal/editar  Editor completo de la versión (crear nueva/sobrescribir)
└── /simulador                Simulación de incrementos de neto (costo marginal)
```

## Ficha por ruta
| Ruta | Archivo responsable | Función | Consulta | Modifica |
|---|---|---|---|---|
| /login | `src/app/login/page.tsx` + `ui.tsx` | Iniciar sesión | Supabase Auth | Cookies de sesión |
| / | `src/app/page.tsx` | KPIs del periodo elegido (vista q1/q2/mes), semáforo presupuestal | PayrollPeriod, PayrollCalculation, Scenario, AppSetting | — |
| /nomina | `src/app/nomina/page.tsx` + `ui.tsx` | Preparar días (editable: días, Vac, Dom, Fest), pagos extra, calcular, ajustar con layout | Employee, AppSetting, BD asistencias, PagoExtra, FiscalParamSet | PayrollPeriod, PayrollCalculation, PagoExtra, AppSetting (borrador de días) |
| /empleados | `src/app/empleados/page.tsx` | Alta/edición de expediente (sueldos, esquema, descuentos, SDI registrado) | Employee, CostCenter, Puesto | Employee, Puesto |
| /empleados/importar | `.../importar/page.tsx` + `ui.tsx` (`src/lib/import.ts`) | Carga masiva por Excel (upsert por número) | Employee, CostCenter | Employee, CostCenter, Puesto |
| /centros-costos | `src/app/centros-costos/page.tsx` | Catálogos de deptos/centros/puestos | CostCenter, Puesto | CostCenter, Puesto |
| /asistencias | `src/app/asistencias/page.tsx` + `ui.tsx` (`src/lib/sync.ts`) | Probar conexión, sincronizar catálogos y trabajadores, configurar códigos de marca | BD asistencias, AppSetting | Employee, CostCenter, AppSetting (codigosCfg, reglaSinMarca) |
| /historial | `src/app/historial/page.tsx` | Lista de periodos; eliminar periodo (definitivo) | PayrollPeriod, PayrollCalculation | PayrollPeriod/Calculation (delete) |
| /historial/importar | `.../importar/*` (`src/lib/import-historico.ts`) | Importar nómina pagada (por RFC, marca IMPORTADO) | Employee, FiscalParamSet | PayrollPeriod, PayrollCalculation |
| /historial/[periodId] | `.../[periodId]/page.tsx` + `ReportesNomina.tsx` | Reportes del periodo (Consolidado/Fiscal/Asimilables/Detalle/Acumulado) + Excel | PayrollCalculation | — |
| /historial/trabajador/[id] | `.../trabajador/[employeeId]/page.tsx` | Historial y acumulado de un trabajador | PayrollCalculation, Employee | — |
| /reporte-mensual | `src/app/reporte-mensual/page.tsx` | Costo por departamento/centro del mes | PayrollCalculation, Employee, CostCenter | — |
| /sdi | `src/app/sdi/page.tsx` + `ui.tsx` | Factor de integración, SDI calc./registrado, SBC a una fecha; Excel | Employee, FiscalParamSet | — |
| /presupuesto | `src/app/presupuesto/page.tsx` | Presupuesto mensual objetivo; escenario propuesto (altas/bajas/incrementos) | Employee, Scenario, ScenarioLine, FiscalParamSet | Scenario, ScenarioLine |
| /configuracion-fiscal | `src/app/configuracion-fiscal/page.tsx` | Ver versiones, activar | FiscalParamSet | FiscalParamSet (estado) |
| /configuracion-fiscal/editar | `.../editar/page.tsx` + `ui.tsx` | Editar TODOS los parámetros; guardar como nueva versión o sobrescribir borrador | FiscalParamSet | FiscalParamSet |
| /simulador | `src/app/simulador/page.tsx` | Costo marginal de subir el neto de un trabajador | Employee, FiscalParamSet | — |

Inventario detallado de campos/botones por pantalla: ver **03-MANUAL-USUARIO** (operación) y **15-TRAZABILIDAD** (técnico). Capturas: insertar en `docs/images/` — **Pendiente de confirmar** (deben tomarse de la app real; este manual no incluye imágenes ficticias).
