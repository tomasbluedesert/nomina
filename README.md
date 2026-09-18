# Costo Real de Nómina — Blue Desert / Seanjuan

Next.js 15 · TypeScript · Prisma · Supabase (Postgres + Auth) · Payroll Engine puro con pruebas.

## Estructura
```
packages/payroll-engine/   motor de cálculo (sin dependencias de Next/DB) + seed/params-2026.json + pruebas Vitest
prisma/schema.prisma       Company, CostCenter, Employee, FiscalParamSet (JSON versionado + sha256), PayrollPeriod,
                           PayrollCalculation (solo INSERT, snapshot inmutable), Scenario, ScenarioLine, AppSetting
prisma/seed.ts             empresa Seanjuan + parámetros 2026 v1 vigentes + umbrales de semáforo
src/lib/actions.ts         server actions: guardarEmpleado (valida duplicados), calcularPeriodo (persiste auditoría), param sets
src/app/api/calcular       POST sin persistir → simuladores
src/app/                   / dashboard · /nomina · /empleados · /simulador · /presupuesto · /configuracion-fiscal
src/components/ResultadoTrabajador.tsx   vista estándar por trabajador (formato Ejemplo 1)
```

## Puesta en marcha
1. Crea un proyecto en Supabase. Copia `.env.example` → `.env` y llena `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. `npm install`
3. `npx prisma migrate dev --name init` (crea las tablas)
4. `npm run db:seed` (empresa + parámetros 2026 v1)
5. `npm run dev` → http://localhost:3000
6. Pruebas del motor: `cd packages/payroll-engine && npm i && npm test`

## Reglas que implementa
- Ningún valor fiscal en código: todo viene de `FiscalParamSet.data` (JSON por ejercicio/versión). Cambiar de ejercicio = cargar JSON en *Configuración fiscal* → Activar.
- Cada cálculo guarda `inputSnapshot`, `result`, `paramSetHash` y usuario (Supabase Auth, si hay sesión). Nunca se actualiza.
- Validaciones: sueldo diario ≤ 0 o < SM, neto pactado < neto fiscal, parámetros faltantes o vencidos, negativos, duplicidad (número/RFC), diferencia residual > $0.01.
- Presupuesto normaliza toda la plantilla a base mensual (30 días; quincenales ×2) para comparar escenarios actual / propuesto / presupuesto y el semáforo usa `AppSetting` (90 % / 100 % por defecto).

## Pendiente / siguientes iteraciones
- Login (Supabase Auth UI) y RLS por `companyId` — el esquema ya lo contempla; hoy se usa la primera empresa.
- Historial de cálculos por trabajador en UI (la tabla ya existe) y exportación Excel/PDF.
- Proyección anual con ajuste anual de ISR (art. 152) — informativo.
