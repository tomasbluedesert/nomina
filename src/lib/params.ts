import { db } from './db';
import type { FiscalParamSet } from '@engine';
import { createHash } from 'node:crypto';
export const hashParams = (p: unknown) => createHash('sha256').update(JSON.stringify(p)).digest('hex');
/** Param set vigente a una fecha; lanza si no hay (PARAMS_FALTANTES). */
export async function paramsVigentes(fecha: Date) {
  const ps = await db.fiscalParamSet.findFirst({ where: { estado: 'vigente', vigenciaDesde: { lte: fecha }, vigenciaHasta: { gte: fecha } }, orderBy: { version: 'desc' } });
  if (!ps) throw new Error(`PARAMS_FALTANTES: no hay parámetros fiscales vigentes para ${fecha.toISOString().slice(0, 10)}`);
  return { row: ps, params: ps.data as unknown as FiscalParamSet };
}
