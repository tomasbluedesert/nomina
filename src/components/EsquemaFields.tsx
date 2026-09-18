'use client';
import { useState } from 'react';
export function EsquemaFields({ esquema, sd, neto }: { esquema: string; sd: string; neto: string }) {
  const [e, setE] = useState(esquema || 'mixto');
  const sdOff = false, netoOff = e !== 'mixto';
  return <>
    <label><span className="lbl">Esquema de pago</span><select name="esquema" className="inp" value={e} onChange={x => setE(x.target.value)}>
      <option value="fiscal">Fiscal (solo nómina fiscal)</option><option value="mixto">Mixto (fiscal + asimilables)</option><option value="asimilables">Asimilables (solo asimilables)</option></select></label>
    <div className="grid grid-cols-2 gap-2">
      <label className={sdOff ? 'opacity-40' : ''}><span className="lbl">{e === 'asimilables' ? 'Sueldo diario libre' : 'Sueldo diario fiscal'}</span><input name="sueldoDiarioFiscal" type="number" step="0.01" min="0" className="inp num" disabled={sdOff} required={!sdOff} defaultValue={sdOff ? '' : sd} /></label>
      <label className={netoOff ? 'opacity-40' : ''}><span className="lbl">Neto pactado por periodo</span><input name="netoPactado" type="number" step="0.01" min="0" className="inp num" disabled={netoOff} required={!netoOff} defaultValue={netoOff ? '' : neto} /></label>
    </div>
    <p className="text-xs text-ink2">{e === 'fiscal' ? 'Se paga sueldo diario × días; el neto es el que resulte.' : e === 'asimilables' ? 'Cobra sueldo diario libre × días trabajados; el motor calcula el bruto asimilable que deja ese neto. Sin IMSS ni prestaciones de ley.' : 'Nómina fiscal con el sueldo diario y asimilables hasta completar el neto pactado.'}</p>
  </>;
}
