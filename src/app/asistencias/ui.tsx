'use client';
import { useEffect, useState, useTransition } from 'react';
import { probarAsistencias, sincronizarCatalogos, sincronizarEmpleados, type LineaSync } from '@/lib/sync';
import { CodigosAsistencia } from '@/components/CodigosAsistencia';
export function Sincronizador() {
  const [estado, setEstado] = useState<Record<string, unknown> | null>(null);
  const [cat, setCat] = useState<Record<string, number> | null>(null);
  const [res, setRes] = useState<{ lineas: LineaSync[]; resumen: Record<string, number> } | null>(null);
  const [soloActivos, setSoloActivos] = useState(true); const [sobre, setSobre] = useState(false); const [desc, setDesc] = useState(true); const [sdi, setSdi] = useState(true);
  const [err, setErr] = useState(''); const [pending, start] = useTransition();
  useEffect(() => { probarAsistencias().then(setEstado); }, []);
  const run = (fn: () => Promise<void>) => start(async () => { setErr(''); try { await fn(); } catch (e) { setErr((e as Error).message); } });
  const color: Record<string, string> = { creado: 'text-sage', actualizado: 'text-cobalt', pendiente_sueldo: 'text-amber', error: 'text-ember', sin_cambio: 'text-ink2/60' };
  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-xl font-semibold">Conexión con Asistencias</h1>
      <div className="card p-4 flex items-center gap-3 text-sm">
        <span className={`w-3 h-3 rounded-full ${!estado ? 'bg-line' : estado.ok ? 'bg-sage' : 'bg-ember'}`} />
        {!estado ? 'Probando conexión…' : estado.ok ? <>Conectado · {String(estado.e)} empleados · {String(estado.a)} registros de asistencia · {String(estado.c)} periodos cerrados</> : <span className="text-ember">{String(estado.error)}</span>}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2">
          <h2 className="font-semibold">1. Catálogos</h2>
          <p className="text-sm text-ink2">Trae departamentos y propiedades (centros de trabajo) de asistencias como centros de costos. No duplica los existentes.</p>
          <button className="btn" disabled={pending || !estado?.ok} onClick={() => run(async () => setCat(await sincronizarCatalogos()))}>Sincronizar catálogos</button>
          {cat && <p className="text-sm">{cat.creados} nuevos · {cat.deptos} departamentos y {cat.centros} propiedades en asistencias</p>}
        </div>
        <div className="card p-4 space-y-2">
          <h2 className="font-semibold">2. Trabajadores</h2>
          <p className="text-sm text-ink2">Cruza por número de empleado (F006…). Identidad, puesto, departamento, fecha de ingreso y periodicidad vienen de asistencias. El sueldo diario fiscal y el neto pactado de nómina se conservan; para altas nuevas se toman de asistencias como valor inicial y se marcan para revisión.</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} />Solo activos</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sobre} onChange={e => setSobre(e.target.checked)} />Sobrescribir sueldos de nómina con los de asistencias (cuidado)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={desc} onChange={e => setDesc(e.target.checked)} />Traer descuentos (Infonavit, Fonacot, pensión) de asistencias</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sdi} onChange={e => setSdi(e.target.checked)} />Traer SDI registrado (salarioIntegrado) de asistencias</label>
          <button className="btn" disabled={pending || !estado?.ok} onClick={() => run(async () => setRes(await sincronizarEmpleados({ soloActivos, sobrescribirSueldos: sobre, traerDescuentos: desc, traerSdi: sdi })))}>{pending ? 'Sincronizando…' : 'Sincronizar trabajadores'}</button>
        </div>
      </div>
      {err && <div className="card p-3 text-ember text-sm">{err}</div>}
      {res && <div className="card p-4">
        <div className="flex flex-wrap gap-5 mb-3 text-sm">{Object.entries(res.resumen).map(([k, v]) => <span key={k} className={color[k]}><b className="num text-lg">{v}</b> {k.replace('_', ' ')}</span>)}</div>
        <table className="ledger w-full"><thead><tr><th>No.</th><th>Nombre</th><th>Resultado</th><th>Detalle</th></tr></thead><tbody>
          {res.lineas.map(l => <tr key={l.numero}><td className="num">{l.numero}</td><td>{l.nombre}</td><td className={color[l.accion]}>{l.accion.replace('_', ' ')}</td><td className="text-xs text-ink2">{l.detalle}</td></tr>)}
        </tbody></table></div>}
      <CodigosAsistencia />
    </div>
  );
}
