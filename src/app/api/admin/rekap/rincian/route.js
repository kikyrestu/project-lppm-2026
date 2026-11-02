// GET /api/admin/rekap/rincian — drill-down: dari angka rekap ke daftar nyata.
//   ?dimensi=status&nilai=Lolos
//   ?dimensi=reviewer&nilai=0412345682
//   ?dimensi=prodi&nilai=Teknik Informatika
//
// Kaprodi memakai rute serupa di /api/prodi/rekap/rincian dan selalu
// dibatasi prodi sendiri.
import { rincian } from '@/modules/rekap/drilldown';
import { ok, fail, ctx } from '@/lib/api';

export async function GET(req) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) {
    return fail(403, 'FORBIDDEN', 'Rincian rekap khusus role ADMIN.');
  }

  const q = new URL(req.url).searchParams;
  const dimensi = q.get('dimensi');
  const nilai = q.get('nilai');
  if (!dimensi || !nilai) {
    return fail(400, 'PARAMETER_KURANG',
      'Parameter dimensi dan nilai wajib diisi.');
  }

  const r = await rincian({
    periodeId: q.get('periodeId') || undefined,
    dimensi, nilai,
  });
  return ok(r);
}
