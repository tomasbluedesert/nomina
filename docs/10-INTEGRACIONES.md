# 10. Integraciones

| Integración | Dirección | Envía | Recibe | Uso |
|---|---|---|---|---|
| Supabase (BD nómina) | app ↔ BD | SQL vía Prisma | filas | Toda la persistencia |
| Supabase Auth | navegador/servidor ↔ Auth | credenciales / cookies | sesión, user.email | Login, protección, calculatedBy |
| Supabase (BD asistencias) | app → BD (RO) | SELECT (`pg`) | empleados.datos JSON, asistencia.dias JSONB, catálogos, incidencias, festivos | Días pagados, V/dom/fest, sync de trabajadores y catálogos, descuentos y salarioIntegrado |
| Excel (xlsx) | archivo ↔ app | — | plantillas/descargas; importa trabajadores, nóminas históricas, layout oficial | Cargas masivas, conciliación, todos los exports |
| GitHub | local → repo | push a main | — | Fuente de verdad del código |
| Netlify | GitHub → hosting | webhook de push | build + deploy | Producción (funciones AWS Lambda) |

Mapa de la BD de asistencias usada (solo lectura, `src/lib/asistencias.ts`): `empleados` (datos: numero, rfc, depto, puesto, claseNomina, salarioDiario/Mensual/Integrado, infonavit, fonacot, pensiones), `asistencia` (periodo "AAAA-MM-Q1", dias {"17":"V"}), `catalogos`, `incidencias` (Bajas/Vacaciones autorizadas), `festivos`, `asis_cerradas`.

No hay integraciones con SAT, correo, ni APIs externas de terceros. **Pendiente de confirmar:** ninguna otra conexión encontrada en el código.
