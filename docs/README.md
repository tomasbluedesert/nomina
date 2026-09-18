# Manual Maestro — Costo Real de Nómina
**Aplicación:** Costo Real de Nómina · Seanjuan S. de R.L. de C.V. (Blue Desert Cabo)
**Versión de aplicación:** en producción continua (rama `main`, despliegue automático en Netlify)
**Versión de documentación:** 1.0 · **Fecha:** 2026-09-17
**Commit analizado:** el vigente en `main` al generar esta documentación (verificar con `git log -1`)
**Rama analizada:** `main` · **Responsable:** Tomás Mundo Sandoval (Dirección de Finanzas)
**Última actualización:** 2026-09-17

Punto de entrada de toda la documentación. Leer en este orden según el perfil:

| Perfil | Ruta de lectura |
|---|---|
| Usuario administrativo | 01 → 03 → 04 |
| Nuevo programador | 01 → 05 → 06 → 08 → 15 → 12 |
| Auditor | 01 → 08 → 09 → 14 (deuda técnica) |

## Índice
| Doc | Contenido |
|---|---|
| [00-INDICE](00-INDICE.md) | Índice detallado |
| [01-RESUMEN-EJECUTIVO](01-RESUMEN-EJECUTIVO.md) | Qué es, qué resuelve, arquitectura general |
| [02-MAPA-APLICACION](02-MAPA-APLICACION.md) | Mapa jerárquico + inventario de pantallas |
| [03-MANUAL-USUARIO](03-MANUAL-USUARIO.md) | Guía paso a paso para no técnicos |
| [04-FLUJOS-OPERATIVOS](04-FLUJOS-OPERATIVOS.md) | Procesos de principio a fin + matriz de procesos |
| [05-ARQUITECTURA](05-ARQUITECTURA.md) | Arquitectura técnica y estructura del proyecto |
| [06-BASE-DE-DATOS](06-BASE-DE-DATOS.md) | Modelos, ERD, relaciones |
| [07-DICCIONARIO-DATOS](07-DICCIONARIO-DATOS.md) | Campo por campo |
| [08-REGLAS-NEGOCIO](08-REGLAS-NEGOCIO.md) | Reglas de negocio y cálculos/fórmulas |
| [09-USUARIOS-PERMISOS](09-USUARIOS-PERMISOS.md) | Autenticación, seguridad, roles |
| [10-INTEGRACIONES](10-INTEGRACIONES.md) | Supabase, asistencias, Excel, Netlify |
| [11-DESPLIEGUE](11-DESPLIEGUE.md) | Local → GitHub → Netlify; migraciones; rollback |
| [12-MANTENIMIENTO](12-MANTENIMIENTO.md) | Guía para modificar sin romper |
| [13-DEPENDENCIAS](13-DEPENDENCIAS.md) | Matriz de dependencias y riesgo |
| [14-DEUDA-TECNICA](14-DEUDA-TECNICA.md) | Hallazgos clasificados |
| [15-TRAZABILIDAD](15-TRAZABILIDAD.md) | Pantalla→acción→Prisma→tabla |
| [16-GLOSARIO](16-GLOSARIO.md) | Términos de negocio y técnicos |

`images/`: carpeta para capturas reales de pantalla. **No contiene imágenes generadas**; las capturas deben tomarse desde la aplicación en producción e insertarse donde el manual indica `[CAPTURA]`.
