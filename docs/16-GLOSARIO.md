# 16. Glosario
| Término | Significado en esta app |
|---|---|
| SD fiscal | Sueldo diario de la nómina fiscal (timbrada) |
| Neto pactado | Cantidad neta acordada con el trabajador por periodo; el sistema trabaja "de neto hacia atrás" |
| SD pactado | Neto pactado ÷ días base (15/30); base de las primas y del prorrateo por faltas |
| Asimilables | Honorarios asimilados a salarios: complemento que cubre la diferencia entre el neto fiscal y el pactado; solo ISR, sin IMSS |
| Cálculo inverso | Obtener el bruto de asimilables necesario para que, tras ISR, quede exactamente el neto objetivo |
| Esquema | fiscal (solo nómina), mixto (fiscal+asimilables), asimilables (SD libre × días) |
| UMA | Unidad de Medida y Actualización; base de exenciones y topes (117.31 en 2026) |
| SDI / SBC | Salario diario integrado (SD × factor, o el registrado ante IMSS) / Salario base de cotización (SDI topado a 25 UMA) |
| Factor de integración | 1 + (aguinaldo + vacaciones×prima)/365 según antigüedad |
| Subsidio al empleo | Apoyo fiscal que reduce el ISR (264.62 quincenal publicado) |
| CyV | Cesantía y vejez; la cuota patronal usa tabla transitoria por nivel de SBC |
| ISN | Impuesto sobre nóminas estatal (3% BCS) sobre bruto fiscal |
| Provisiones | Devengo proporcional de aguinaldo y prima vacacional por periodo (costo, no pago) |
| Carga laboral | Todo lo que cuesta el trabajador además de su neto (ISR+IMSS+cargas patronales) |
| Costo real | Bruto fiscal + bruto asimilables + cargas patronales del periodo |
| Layout oficial | Excel con ISR/IMSS/asimilables de la nómina timbrada, usado para ajustar/conciliar |
| Versión de parámetros | Fotografía completa de UMA/tarifas/reglas con vigencia; los cálculos quedan sellados a su versión (hash) |
| Marcas de asistencia | A asistencia · D descanso · V vacaciones · DF día festivo · DT descanso trabajado · TXT tiempo por tiempo · P permiso · PS permiso sin goce · I incapacidad · B baja |
| Corrida | Un cálculo guardado de un trabajador en un periodo (PayrollCalculation); recalcular agrega corridas, no borra |
| Periodo importado | Periodo cargado desde nómina pagada externa; importes reales, sin cargas patronales |
| Server Action | Función del servidor invocada directamente desde la interfaz (mecanismo de Next.js usado en lugar de APIs REST) |

# Cobertura de documentación
| Métrica | Valor |
|---|---|
| Módulos de menú | 12 (+login) |
| Pantallas/rutas (page.tsx) | 17 |
| Modelos/tablas Prisma | 11 (+5 enums) |
| Procesos documentados | 14 (matriz) / 9 flujos completos |
| Reglas de negocio identificadas | 14 (N1–N14) + 12 fórmulas |
| Integraciones | 6 |
| Server actions/funciones exportadas analizadas | 38 en src/lib + 18 del engine |
| Pruebas del motor | 21 |
| Pendientes de confirmar | capturas de pantalla reales; UI de umbrales de semáforo; commit exacto al momento de leer esta doc |
