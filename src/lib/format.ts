export const mxn = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
export const num = (n: number, d = 2) => (Number.isFinite(n) ? n : 0).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (n: number) => `${num(n, 1)}%`;
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export function rangoPeriodo(tipo: 'quincenal' | 'mensual', anio: number, mes: number, q?: 1 | 2) {
  const ult = new Date(Date.UTC(anio, mes, 0)).getUTCDate(); const m = String(mes).padStart(2, '0');
  if (tipo === 'mensual') return { fecha_inicio: `${anio}-${m}-01`, fecha_fin: `${anio}-${m}-${ult}` };
  return q === 1 ? { fecha_inicio: `${anio}-${m}-01`, fecha_fin: `${anio}-${m}-15` } : { fecha_inicio: `${anio}-${m}-16`, fecha_fin: `${anio}-${m}-${ult}` };
}
