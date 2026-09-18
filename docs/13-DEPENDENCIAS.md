# 13. Mapa de dependencias

| Componente | Depende de | Utilizado por | Riesgo al modificar |
|---|---|---|---|
| `packages/payroll-engine/src/index.ts` | types.ts, parámetros JSON | calcularPeriodo, presupuesto, simulador, SDI, importador (estructura result) | **CRÍTICO** — todo importe sale de aquí; un cambio sin prueba altera nóminas y conciliación |
| `types.ts` (engine) | — | engine, reportes, ResultadoTrabajador, importadores | **CRÍTICO** — contrato del JSON `result`; quitar/renombrar campos rompe lectura de históricos |
| `FiscalParamSet.data` (estructura) | types.ts | engine, editor, seed, SDI | **CRÍTICO** — versiones viejas deben seguir siendo legibles (campos nuevos siempre opcionales con default) |
| `src/lib/actions.ts` | engine, db, dias, params, supabase | casi todas las pantallas | **ALTO** — concentra el flujo de cálculo y persistencia |
| `prisma/schema.prisma` | — | todo vía Prisma Client | **ALTO** — cambios = migración en producción (BD única) |
| `src/lib/dias.ts` | asistencias.ts, AppSetting | prepararPeriodo/calcularPeriodo | **ALTO** — días equivocados = nómina equivocada |
| `src/lib/params.ts` | db | cálculo, SDI, presupuesto, simulador | **ALTO** — selección de versión vigente y hash de integridad |
| `src/middleware.ts` | @supabase/ssr | todas las rutas | **ALTO** — un error deja la app abierta o inaccesible |
| `src/lib/asistencias.ts` | pg, ASISTENCIAS_DATABASE_URL, esquema remoto | dias.ts, sync.ts | MEDIO — cambios del esquema remoto rompen sync/días (falla contenida: días caen a base fija) |
| `ReportesNomina.tsx` / `ResultadoTrabajador.tsx` | types del engine | historial, nómina | MEDIO — solo presentación, pero debe tolerar resultados viejos (`?? 0`) |
| `import.ts` / `import-historico.ts` / layout oficial | xlsx, formatos de archivo | cargas | MEDIO — sensibles a encabezados; normalización snake_case los protege |
| `netlify.toml`, `binaryTargets`, scripts npm | — | despliegue | MEDIO — mal cambio = deploy caído (rollback fácil) |
| `format.ts`, componentes de catálogo, layout.tsx | — | UI | BAJO |
