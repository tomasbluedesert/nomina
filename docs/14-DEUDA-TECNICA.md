# 14. Problemas y deuda técnica (solo hallazgos; nada se modificó)

| # | Hallazgo | Evidencia | Nivel |
|---|---|---|---|
| 1 | **Un solo entorno de BD**: desarrollo local y producción usan la misma base de Supabase | `.env` local = variables de Netlify | **ALTO** — un experimento local toca datos reales. Mitigación futura: proyecto Supabase de staging o branch de BD |
| 2 | **Credenciales expuestas durante el desarrollo** (chat de construcción) | proceso de desarrollo | **ALTO hasta rotar** — resetear contraseñas de ambos proyectos y actualizar .env+Netlify |
| 3 | **Sin roles/permisos**: todo autenticado puede eliminar periodos, editar parámetros | middleware + ausencia de checks de rol en actions | MEDIO |
| 4 | **Casts `as unknown as Prisma.InputJsonValue`** entre ResultadoTrabajador y Json | actions.ts, import-historico.ts | MEDIO — pierde verificación de tipos al guardar; el contrato real es types.ts. Alternativa: zod/serializador tipado |
| 5 | **Lecturas N+1 en agregaciones**: dashboard/reportes leen cálculos por periodo en bucle | `resumenPeriodos` (page.tsx), acumulados | MEDIO — aceptable con ~62 trabajadores y pocos periodos; revisar si crece |
| 6 | **`eliminarPeriodo` sin confirmación de UI** (un clic borra definitivo) | historial/page.tsx | MEDIO |
| 7 | Importador histórico: reimportar sin eliminar duplica corridas (queda la última en vistas, pero infla auditoría) | import-historico.ts (create sin verificación de existente) | MEDIO |
| 8 | Fechas de periodo construidas con `new Date('YYYY-MM-DD')`/UTC en varios puntos; consistente hoy, frágil ante cambios de zona horaria | actions.ts, page.tsx (getUTC*) | BAJO |
| 9 | Umbrales de semáforo (semaforo_*_pct) sin pantalla de edición | dashboard lee AppSetting; no hay UI que los escriba — Pendiente de confirmar | BAJO |
| 10 | Textos/labels con lógica repetida entre ReportesNomina y ResultadoTrabajador (mapeos de conceptos) | ambos componentes | BAJO |
| 11 | `xlsx` (SheetJS 0.18.5) sin actualizaciones frecuentes upstream | package.json | BAJO — vigilar avisos de seguridad |
| 12 | Funcionalidad incompleta declarada: pensión como %, Infonavit por factor VSM, vista acumulado anual vs presupuesto | ofrecidas y no construidas | BAJO (backlog, no defecto) |

No se encontraron: endpoints sin protección (no hay API pública), secretos en el repositorio (.gitignore correcto), uso de `any` explícito en rutas críticas.
