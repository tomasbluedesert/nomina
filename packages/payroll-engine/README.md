# @bluedesert/payroll-engine
Motor puro (sin Next/Prisma). `npm i && npm test` (10 pruebas, incluye propiedad de 2,000 netos aleatorios) · `npm run examples`.
- `seed/params-2026.json` → FiscalParamSet 2026 v1 (lo que se insertará en `fiscal_param_set`). Nada fiscal vive en `src/`.
- API: `calcularCostoReal(emp, periodo, params)`, `calcularNominaFiscal`, `calcularAsimilables`, `calcularCargasPatronales`, `simularIncremento`, `validar`, `brutoDesdeNeto`.
Supuestos del motor (todos parametrizados): subsidio = monto fijo mensual si ingreso ≤ límite, escalado por días/30; periodos personalizados escalan la tarifa mensual por días/30; CyV primera fila si SBC ≤ 1 SM, resto por múltiplos de UMA; SDI = SD × factor (aguinaldo + vac×prima); provisiones aguinaldo/prima vacacional prorrateadas por días/365.
