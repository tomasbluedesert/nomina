export type Periodicidad = 'quincenal' | 'mensual' | 'personalizado';
export type TipoCalculo = 'mensual_fijo' | 'quincenal_fijo' | 'diario_x_dias';
/** fiscal: solo nómina fiscal (SD fiscal × días) · mixto: fiscal + asimilables hasta el neto pactado · asimilables: sueldo diario LIBRE × días trabajados = neto, todo por asimilables */
export type Esquema = 'fiscal' | 'mixto' | 'asimilables';

export interface IsrBracket { li: number; ls: number | null; cf: number; pct: number }
export interface RamoImss { patron: number; obrero: number }
export interface CyvRow { desde: number; hasta: number | null; unidad: 'SM' | 'UMA'; pct: number }

export interface FiscalParamSet {
  ejercicio: number; vigencia_desde: string; vigencia_hasta: string; version: number;
  uma_diaria: number; uma_mensual: number;
  salario_minimo_general: number; salario_minimo_frontera: number; tope_cotizacion_umas: number;
  subsidio: { aplica: boolean; monto_mensual: number; limite_ingreso_mensual: number; dias_base_mensual: number; monto_quincenal?: number };
  isr: { quincenal: IsrBracket[]; mensual: IsrBracket[] };
  imss: {
    enf_mat_cuota_fija_pct_uma: RamoImss; enf_mat_excedente_3uma: RamoImss; prestaciones_dinero: RamoImss;
    gastos_medicos_pensionados: RamoImss; invalidez_vida: RamoImss; guarderias: RamoImss; retiro_sar: RamoImss;
    infonavit: RamoImss; cesantia_vejez_obrero: number; cesantia_vejez_patron: CyvRow[]; exencion_obrero_salario_minimo: boolean;
  };
  isn: { estado: string; pct: number; incluye_asimilables: boolean };
  /** Comisión por dispersión de asimilables: pct sobre el neto depositado, más IVA sobre la comisión. Ausente = 0. */
  asimilables_comision?: { pct: number; iva_pct: number };
  /** Tarifa para ISR de asimilables: 'mensual' (práctica de la nómina histórica) o 'periodo' */
  asimilables_tarifa?: 'mensual' | 'periodo';
  lft: { dias_aguinaldo: number; prima_vacacional: number; vacaciones: number[]; prima_vacacional_exenta_umas?: number;
    prima_dominical?: number; prima_dominical_exenta_umas?: number; festivo_extra_pct?: number; festivo_exento_pct?: number; festivo_exento_umas_semana?: number };
  empresa: { prima_riesgo_trabajo: number };
  motor: { tolerancia: number; max_iteraciones: number; dias_mes_fijo: number; dias_quincena_fija: number };
}

export interface Periodo { tipo: Periodicidad; fecha_inicio: string; fecha_fin: string }

export interface EmpleadoInput {
  numero_empleado?: string; nombre?: string; esquema?: Esquema;
  sueldo_diario_fiscal: number; neto_pactado: number;
  tipo_calculo: TipoCalculo; fecha_ingreso: string;
  zona_frontera?: boolean; otras_deducciones?: number;
  /** SDI registrado ante IMSS; si se indica, sustituye al SDI calculado con factor de integración */
  sdi_override?: number;
  /** Valores oficiales de la nómina externa: sustituyen a los calculados; la diferencia se reporta como warning */
  overrides?: { isr_nomina?: number; imss_obrero?: number; subsidio?: number; asimilables?: { bruto: number; isr: number } };
  /** Descuentos fijos por periodo sobre nómina fiscal (no los compensan los asimilables) */
  descuentos?: { infonavit?: number; fonacot?: number; prestamo?: number; pension?: number; otros?: number };
  /** Pagos extraordinarios del periodo: fiscal = bruto gravable (sin IMSS); asimilables = neto a recibir */
  extras?: { fiscal?: number; asimilables?: number; detalle?: { concepto: string; importe: number; destino: 'fiscal' | 'asimilables' }[] };
  /** Días pagados reales (asistencias o captura); si se indica, sustituye al cálculo por tipo_calculo */
  dias_override?: number; dias_detalle?: Record<string, number>;
  /** Días de vacaciones disfrutadas en el periodo (incluidos en dias pagados): se separan del sueldo y generan prima vacacional */
  dias_vacaciones?: number;
  /** Domingos trabajados (prima dominical) y días festivos trabajados (pago extra) en el periodo */
  domingos_trabajados?: number; festivos_trabajados?: number;
  prestaciones_adicionales_periodo?: number; otras_cargas_periodo?: number;
}

export interface Warning { codigo: string; mensaje: string; valor?: number }

export interface NominaFiscal {
  dias_pagados: number; sueldo_diario: number; bruto_fiscal: number;
  dias_sueldo: number; sueldo: number; dias_vacaciones: number; vacaciones: number; prima_vacacional: number; prima_exenta: number; prima_gravada: number;
  extras_fiscal: number; domingos: number; prima_dominical: number; prima_dominical_exenta: number; festivos: number; pago_festivos: number; festivos_exento: number; base_gravada: number; ajuste_neto?: number;
  isr_tarifa: number; subsidio: number; isr_nomina: number; subsidio_entregado: number;
  sdi: number; sdi_fuente: 'registrado' | 'calculado'; factor_integracion: number; sbc: number; imss_obrero: number; imss_obrero_detalle: Record<string, number>;
  otras_deducciones: number; descuentos_detalle: Record<string, number>; neto_fiscal_sin_descuentos: number; neto_fiscal: number;
}
export interface Asimilables { neto_objetivo: number; neto_pactado_dias: number; extras_pactado: number; extras_neto: number; bruto: number; isr: number; neto: number; metodo: string; iteraciones: number; diff: number }
export interface CargasPatronales {
  imss_patron: number; imss_patron_detalle: Record<string, number>; infonavit: number; sar: number; cesantia_vejez: number;
  isn: number; comision_asimilables: number; iva_comision: number; prestaciones_periodo: number; prestaciones_detalle: Record<string, number>; otras_cargas: number; total: number;
}
export interface ResultadoTrabajador {
  periodo: Periodo; esquema: Esquema; nomina: NominaFiscal; asimilables: Asimilables; cargas: CargasPatronales;
  neto_total: number; neto_pactado: number; diferencia: number;
  costo_real_total: number; carga_laboral: number; pct_carga_sobre_neto: number; pct_carga_sobre_costo: number; relacion_costo_neto: number;
  warnings: Warning[];
}
