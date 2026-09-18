'use client';
import { useState, useTransition } from 'react';
import { importarEmpleados, plantillaBase64, type ResultadoFila } from '@/lib/import';
export function Importador() {
  const [res, setRes] = useState<{ resultados: ResultadoFila[]; resumen: Record<string, number> } | null>(null);
  const [err, setErr] = useState(''); const [pending, start] = useTransition();
  const descargar = async (conDatos: boolean) => { const b64 = await plantillaBase64(conDatos); const a = document.createElement('a'); a.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + b64; a.download = conDatos ? `empleados_${new Date().toISOString().slice(0, 10)}.xlsx` : 'plantilla_empleados.xlsx'; a.click(); };
  const color: Record<string, string> = { creado: 'text-sage', actualizado: 'text-cobalt', error: 'text-ember', omitido: 'text-ink2/60' };
  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-baseline justify-between"><h1 className="text-xl font-semibold">Carga masiva de trabajadores</h1><a href="/empleados" className="text-sm text-cobalt">← Empleados</a></div>
      <div className="card p-4 grid md:grid-cols-[1fr_auto] gap-4 items-start">
        <div className="text-sm text-ink2 space-y-1">
          <p>1. Descarga la plantilla y llena una fila por trabajador (hoja <b>Instrucciones</b> explica cada columna).</p>
          <p>2. Sube el archivo. Los números de empleado que ya existan se <b>actualizan</b>; los nuevos se crean. Las filas con error no se guardan y se reportan abajo.</p>
          <p><b>Para cambios masivos</b>: descarga los trabajadores actuales, edita en Excel (departamento, centro de costos, sueldos, esquema…) y vuelve a subir el mismo archivo. No borres la columna numero_empleado.</p>
          <p>3. También acepta .csv con los mismos encabezados.</p>
        </div>
        <div className="flex flex-col gap-2"><button className="btn" onClick={() => descargar(true)}>Descargar trabajadores actuales (.xlsx)</button><button className="btn-ghost" onClick={() => descargar(false)}>Plantilla vacía con ejemplos</button></div>
      </div>
      <form className="card p-4 flex flex-wrap items-end gap-3" action={fd => start(async () => { setErr(''); try { setRes(await importarEmpleados(fd)); } catch (e) { setErr((e as Error).message); } })}>
        <label className="flex-1"><span className="lbl">Archivo</span><input name="archivo" type="file" accept=".xlsx,.xls,.csv" className="inp" required /></label>
        <button className="btn" disabled={pending}>{pending ? 'Importando…' : 'Importar'}</button>
      </form>
      {err && <div className="card p-3 text-ember text-sm">{err}</div>}
      {res && <div className="card p-4">
        <div className="flex gap-5 mb-3 text-sm">{['creado', 'actualizado', 'error', 'omitido'].map(k => <span key={k} className={color[k]}><b className="num text-lg">{res.resumen[k] ?? 0}</b> {k === 'creado' ? 'creados' : k === 'actualizado' ? 'actualizados' : k === 'error' ? 'con error' : 'omitidos'}</span>)}</div>
        <table className="ledger w-full"><thead><tr><th className="r">Fila</th><th>No.</th><th>Nombre</th><th>Resultado</th><th>Detalle</th></tr></thead><tbody>
          {res.resultados.filter(r => r.accion !== 'omitido').map(r => <tr key={r.fila}><td className="r">{r.fila}</td><td className="num">{r.numero}</td><td>{r.nombre}</td><td className={color[r.accion]}>{r.accion}</td><td className="text-xs text-ink2">{r.detalle}</td></tr>)}
        </tbody></table>
      </div>}
    </div>
  );
}
