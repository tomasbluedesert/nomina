import { NextResponse } from 'next/server';
import { calcularCostoReal, simularIncremento, type EmpleadoInput, type Periodo } from '@engine';
import { paramsVigentes } from '@/lib/params';
/** POST {empleado, periodo, netoNuevo?} → resultado del motor con los parámetros vigentes (sin persistir: simuladores). */
export async function POST(req: Request) {
  try {
    const { empleado, periodo, netoNuevo } = (await req.json()) as { empleado: EmpleadoInput; periodo: Periodo; netoNuevo?: number };
    const { params, row } = await paramsVigentes(new Date(periodo.fecha_fin));
    const data = netoNuevo ? simularIncremento(empleado, netoNuevo, periodo, params) : calcularCostoReal(empleado, periodo, params);
    return NextResponse.json({ ok: true, paramSet: `${row.ejercicio} v${row.version}`, data });
  } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }); }
}
