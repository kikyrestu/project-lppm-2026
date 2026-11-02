// GET /api/prodi/rekap/rincian — drill-down terbatas pada prodi sendiri
// (khusus KAPRODI). Prodi diturunkan dari akun, bukan parameter klien.
import { prisma } from '@/lib/prisma';
import { rincian } from '@/modules/rekap/drilldown';
import { ok, fail, ctx } from '@/lib/api';

export async function GET(req) {
  const c = ctx(req);
  if (!c.hasRole('KAPRODI')) {
    return fail(403, 'FORBIDDEN', 'Rincian rekap khusus role KAPRODI.');
  }

  const u = await prisma.users.findUnique({
    where: { id: c.userId },
    select: { programStudiId: true },
  });
  if (!u?.programStudiId) {
    return fail(400, 'PRODI_BELUM_DISET',
      'Akun ini belum terikat pada program studi.');
  }

  const q = new URL(req.url).searchParams;
  const dimensi = q.get('dimensi');
  const nilai = q.get('nilai');
  if (!dimensi || !nilai) {
    return fail(400, 'PARAMETER_KURANG',
      'Parameter dimensi dan nilai wajib diisi.');
  }

  // programStudiId dikunci ke prodi sendiri — nilai dari klien diabaikan.
  const r = await rincian({
    periodeId: q.get('periodeId') || undefined,
    dimensi, nilai,
    programStudiId: u.programStudiId,
  });
  return ok({ ...r, cakupan: 'PRODI' });
}
