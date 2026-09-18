# 12. Guía de mantenimiento
Regla de oro del proyecto: **el motor de cálculo no toca BD ni UI; la UI no calcula**. Conservarla mantiene el sistema auditable y probable.

| Vas a modificar… | Debes saber | Pasos seguros |
|---|---|---|
| Una pantalla | `page.tsx` = server (lee BD, sin hooks); `ui.tsx` = client (`'use client'`). Estilos: clases utilitarias (card, inp, btn, ledger, lbl, num, r) en `globals.css` | Editar → `npx tsc --noEmit` → probar local → push |
| Un cálculo | TODO cálculo vive en `packages/payroll-engine/src/index.ts`; sus tipos en `types.ts`. Los 21 tests incluyen casos conciliados al centavo con nómina real: si un cambio los rompe, probablemente rompe la conciliación | Cambiar engine → agregar prueba del nuevo criterio → `npm test` → si cambia un criterio fiscal, evaluar si debe ser PARÁMETRO (editor) y no código |
| Un parámetro fiscal (UMA, tarifas, %) | NO se cambia en código: se crea **nueva versión** en /configuracion-fiscal/editar con su vigencia y se activa. `seed/params-2026.json` solo alimenta seeds nuevos | Editor → nueva versión → activar. Nunca editar el JSON de una versión usada por cálculos (el hash delataría la inconsistencia) |
| Una tabla (esquema) | Fuente única `prisma/schema.prisma`. `result` de PayrollCalculation es JSON: agregar campos al engine NO requiere migración, pero los reportes deben tolerar registros viejos (usar `?? 0` — patrón ya aplicado) | Editar schema → `npx prisma migrate dev --name x` (local, aplica a producción) → `npx prisma generate` → ajustar código → push |
| Un usuario de la app | Supabase → Authentication → Users; sin cambios de código | Alta con Auto Confirm / reset password / borrar |
| Una configuración de empresa | AppSetting (codigosCfg, reglaSinMarca, semáforo) se edita desde la propia app (/asistencias, valores de semáforo hoy solo por BD — Pendiente de confirmar UI) | Preferir la UI; si es por SQL, respetar el formato JSON |
| Una regla de negocio | Ubicarla en doc 08 (tabla N1–N14 con función). Muchas son parámetro (N5, N9, N10): cambiarlas es crear versión, no programar | Confirmar si es parámetro; si es código, cambiar engine + prueba |
| Una server action | Viven en `src/lib` con `'use server'`; siempre obtienen `companyId()` y revalidan rutas. No exponer datos sin sesión (el middleware ya cubre rutas, no APIs externas — no hay) | Mantener el patrón; tipos estrictos (InputJsonValue para campos Json de Prisma) |
| Variables de entorno | 5 variables; cambiar una implica: `.env` local + Netlify + redeploy. DATABASE_URL siempre pooler 6543 con pgbouncer | Ver doc 11 |

Riesgos generales: (1) producción y desarrollo comparten BD — probar cálculos en periodos de prueba y eliminarlos; (2) resincronizar asistencias pisa identidad local (nombre/depto); (3) eliminar periodo es definitivo.
