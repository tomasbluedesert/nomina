import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import params from '../packages/payroll-engine/seed/params-2026.json';
const db = new PrismaClient();
async function main() {
  const co = await db.company.upsert({ where: { rfc: 'SEA000000XXX' }, update: {}, create: { razonSocial: 'Seanjuan S. de R.L. de C.V.', rfc: 'SEA000000XXX', estadoIsn: 'BCS', primaRiesgo: params.empresa.prima_riesgo_trabajo } });
  const hash = createHash('sha256').update(JSON.stringify(params)).digest('hex');
  await db.fiscalParamSet.upsert({ where: { ejercicio_version: { ejercicio: 2026, version: 1 } }, update: {},
    create: { ejercicio: 2026, version: 1, vigenciaDesde: new Date(params.vigencia_desde), vigenciaHasta: new Date(params.vigencia_hasta), estado: 'vigente', data: params as object, hashSha256: hash, createdBy: 'seed' } });
  for (const [k, v] of Object.entries({ semaforo_amarillo_pct: '90', semaforo_rojo_pct: '100', dias_aviso_vencimiento: '30' }))
    await db.appSetting.upsert({ where: { companyId_key: { companyId: co.id, key: k } }, update: {}, create: { companyId: co.id, key: k, value: v } });
  console.log('Seed OK', co.id, hash.slice(0, 12));
}
main().finally(() => db.$disconnect());
