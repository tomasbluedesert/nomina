'use client';
import * as XLSX from 'xlsx';
import { num } from '@/lib/format';
type Fila = { numero: string; nombre: string; depto: string; esquema: string; ingreso: string; anios: number; vac: number; factor: number; sd: number; sdi: number; registrado: number | null; usado: number; dif: number | null; sbc: number; topado: boolean; bajoSM: boolean };
export function ReporteSDI({ filas, fecha, etiqueta, aguinaldo, prima, uma, tope, sm }: { filas: Fila[]; fecha: string; etiqueta: string; aguinaldo: number; prima: number; uma: number; tope: number; sm: number }) {
  const exportar = () => {
    const aoa = [['No.', 'Nombre', 'Departamento', 'Esquema', 'Fecha ingreso', 'Años', 'Días vacaciones', 'Prima vac. %', 'Días aguinaldo', 'Factor integración', 'SD fiscal', 'SDI calculado', 'SDI registrado', 'Diferencia', 'SDI en uso', 'SBC'], ...filas.map(f => [f.numero, f.nombre, f.depto, f.esquema, f.ingreso, f.anios, f.vac, prima * 100, aguinaldo, f.factor, f.sd, f.sdi, f.registrado ?? '', f.dif ?? '', f.usado, f.sbc])];
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = aoa[0].map((_, i) => ({ wch: i === 1 ? 32 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'SDI'); XLSX.writeFile(wb, `SDI_${fecha}.xlsx`);
  };
  return <div className="space-y-4">
    <form className="card p-4 flex flex-wrap items-end gap-3">
      <div><h1 className="text-xl font-semibold">Salario diario integrado</h1><span className="lbl">Parámetros {etiqueta} · UMA {num(uma)} · tope 25 UMA = {num(tope)} · SM {num(sm)} · aguinaldo {aguinaldo} días · prima {num(prima * 100, 0)}%</span></div>
      <label className="ml-auto"><span className="lbl">Calcular a la fecha</span><input type="date" name="fecha" className="inp" defaultValue={fecha} /></label>
      <button className="btn-ghost">Actualizar</button><button type="button" className="btn-ghost" onClick={exportar}>Exportar Excel</button>
    </form>
    <div className="card overflow-x-auto"><table className="ledger w-full text-sm"><thead><tr><th className="pl-3">No.</th><th>Nombre</th><th>Depto</th><th>Esquema</th><th>Ingreso</th><th className="r">Años</th><th className="r">Días vac.</th><th className="r">Factor</th><th className="r">SD fiscal</th><th className="r">SDI calc.</th><th className="r">SDI reg.</th><th className="r">Dif.</th><th className="r">SBC</th></tr></thead><tbody>
      {filas.map(f => <tr key={f.numero}><td className="pl-3 num">{f.numero}</td><td>{f.nombre}</td><td className="text-xs">{f.depto}</td><td className="text-xs">{f.esquema}</td><td className="num text-xs">{f.ingreso}</td><td className="r">{f.anios}</td><td className="r">{f.vac}</td><td className="r">{num(f.factor, 4)}</td><td className={`r ${f.bajoSM ? 'text-ember' : ''}`}>{num(f.sd)}</td><td className={`r ${f.registrado === null ? 'font-semibold' : ''}`}>{num(f.sdi)}</td><td className={`r ${f.registrado !== null ? 'font-semibold' : 'text-ink2/40'}`}>{f.registrado !== null ? num(f.registrado) : '—'}</td><td className={`r ${f.dif && Math.abs(f.dif) > 0.01 ? 'text-ember' : ''}`}>{f.dif !== null ? num(f.dif) : ''}</td><td className={`r ${f.topado ? 'text-amber' : ''}`}>{num(f.sbc)}</td></tr>)}
      {!filas.length && <tr><td colSpan={13} className="p-6 text-center text-ink2">Sin trabajadores fiscales o mixtos activos.</td></tr>}
    </tbody></table></div>
    <p className="text-xs text-ink2">Factor = 1 + (días de aguinaldo + días de vacaciones × prima vacacional) / 365, con los días de vacaciones del año de antigüedad que se cumple a la fecha (tabla LFT de los parámetros). SDI calc. = SD fiscal × factor. Si hay SDI registrado (expediente, Excel o asistencias) la nómina usa ese y no lo recalcula; aparece en negritas el que está en uso y en rojo la diferencia entre ambos. SBC = SDI en uso topado a 25 UMA (ámbar si topa). SD en rojo = menor al salario mínimo. Los asimilables puros no cotizan y no aparecen.</p>
  </div>;
}
