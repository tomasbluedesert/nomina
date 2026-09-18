# 3. Manual del usuario (no técnico)
Todas las cantidades son MXN. Donde dice `[CAPTURA]`, insertar imagen real desde la app (carpeta `images/`).

### Cómo entrar a la aplicación
**Paso 1** Abre `https://costonomina.netlify.app` (funciona en computadora y celular). [CAPTURA]
**Paso 2** Escribe tu correo y contraseña y pulsa **Entrar**. No existe auto-registro: los accesos los da de alta el administrador.
**Resultado esperado:** el Dashboard con el último periodo. Para salir: botón **Salir** (barra superior).

### Cómo calcular una quincena
**Paso 1** Menú **Nómina** → elige tipo (quincenal/mensual), mes, año y quincena → **Preparar días**. [CAPTURA]
**Paso 2** Revisa la tabla: días pagados (vienen de asistencias si hay marcas; si no, base fija), y las columnas **Vac.** (días V), **Dom. trab.** y **Fest. trab.** Todas son editables y se guardan como borrador automáticamente.
**Paso 3** (Opcional) En **Pagos extraordinarios del periodo** agrega bonos: trabajador, concepto, importe y destino — *Nómina fiscal (bruto gravable)* o *Asimilables (neto a recibir)*.
**Paso 4** **Calcular nómina**. Verás el resumen y cada trabajador con su desglose (fiscal, asimilables, cargas patronales, indicadores). [CAPTURA]
**Paso 5** (Opcional, conciliación) En la barra de resultados sube el layout de la nómina timbrada y pulsa **Ajustar con layout ISR/IMSS**: el sistema recalcula usando el ISR/IMSS/asimilables oficiales, mantiene el neto pactado y marca las diferencias como avisos.
**Resultado esperado:** el periodo queda guardado en **Historial**; recalcular reemplaza la vista (la corrida anterior queda en auditoría).

### Cómo dar de alta o editar un trabajador
**Paso 1** Menú **Empleados** → panel **Nuevo trabajador** (clic para abrir) o botón **Editar** en la fila. [CAPTURA]
**Paso 2** Captura: número, nombre, RFC, fecha de ingreso, puesto, departamento, centro, **esquema** (fiscal/mixto/asimilables), SD fiscal, neto pactado, periodicidad, tipo de cálculo, **SDI registrado** (opcional: si se captura, el IMSS se calcula con ese SDI y no con el factor) y **descuentos fijos** (Infonavit, Fonacot, préstamo, pensión).
**Paso 3** **Guardar trabajador**.
**Resultado esperado:** aparece en la tabla y entra en el siguiente cálculo. Para muchos a la vez: **Carga masiva (Excel)** (descarga la plantilla o los actuales, edita, sube).

### Cómo traer datos de asistencias
**Paso 1** Menú **Asistencias** → **Probar conexión**.
**Paso 2** **Sincronizar catálogos** (deptos, propiedades, puestos) y luego **Sincronizar trabajadores** con las casillas: solo activos, sobrescribir sueldos, traer descuentos, traer SDI registrado.
**Paso 3** En **Códigos** define qué marcas pagan y cuáles cuentan como día trabajado (A, D, V, DF, DT, TXT, P, PS, I, B) y la regla de **sin marca**.
**Resultado esperado:** trabajadores y días alineados con asistencias. Ojo: la identidad (nombre, depto) manda desde asistencias; resincronizar pisa cambios locales de esos campos.

### Cómo importar una nómina ya pagada (histórico)
**Paso 1** **Historial → Importar histórica** → elige el archivo de extracción de recibos → selecciona la hoja del periodo (una quincena por hoja; la de acumulado anual no se importa) → **Importar hoja**. [CAPTURA]
**Paso 2** Revisa el resumen: verde=importado, rojo=RFC no existe en Empleados (dalo de alta y, para reimportar, primero **Eliminar** el periodo en Historial).
**Resultado esperado:** el periodo aparece en Historial marcado *importado*, con netos al centavo (incluye Ajuste al neto); sin cargas patronales (los recibos no las traen).

### Cómo leer el Dashboard y el presupuesto
Combo **Vista** (1ª quincena / 2ª / Mensual) + mes + año → **Ver**. La vista Mensual suma las dos quincenas si no hay periodo mensual. La sección **Presupuesto** compara el costo contra el presupuesto mensual (o su mitad por quincena) con semáforo verde/ámbar/rojo y el monto disponible o excedido. El presupuesto se captura en el menú **Presupuesto**.

### Cómo actualizar parámetros fiscales (UMA, tarifas, etc.)
**Configuración fiscal → Editar**: modifica los valores → guarda como **nueva versión** con su vigencia → **Activar**. Los cálculos ya hechos no cambian (cada uno guarda su versión); p. ej., enero puede tener su propia versión con UMA del año anterior conviviendo con la del resto del año.

### Errores frecuentes
| Mensaje | Causa | Solución |
|---|---|---|
| "No hay parámetros vigentes para la fecha" | Ninguna versión activa cubre el periodo | Configuración fiscal: activar/crear versión con esa vigencia |
| "RFC no existe en el catálogo" (importador) | Trabajador no dado de alta | Alta en Empleados y reimportar |
| "Correo o contraseña incorrectos" | Credencial o usuario sin confirmar | Administrador: Supabase → Authentication → Users |
| Página pide login constantemente | Sesión expirada | Volver a entrar |
