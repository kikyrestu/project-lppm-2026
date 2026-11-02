// GET /api/prodi/rekap — rekap untuk program studi sendiri (khusus KAPRODI)
// Prodi diturunkan dari akun, bukan dari parameter klien, sehingga seorang
// Kaprodi tidak pernah bisa meminta angka prodi lain.
import { prisma } from '@/lib/prisma';
import { rekap } from '@/modules/rekap/service';
import { ok, fail, ctx } from '@/lib/api';

export async function GET(req) {
  const c = ctx(req);
  if (!c.hasRole('KAPRODI')) {
    return fail(403, 'FORBIDDEN', 'Rekap program studi khusus role KAPRODI.');
  }

  const u = await prisma.users.findUnique({
    where: { id: c.userId },
    select: { programStudiId: true, programStudi: { select: { nama: true } } },
  });
  if (!u?.programStudiId) {
    return fail(400, 'PRODI_BELUM_DISET',
      'Akun ini belum terikat pada program studi, sehingga rekap tidak dapat dihitung.');
  }

  const q = new URL(req.url).searchParams;
  const r = await rekap({
    periodeId: q.get('periodeId') || undefined,
    tahunAkademik: q.get('tahunAkademik') || undefined,
    programStudiId: u.programStudiId,
  });
  if (!r) return fail(404, 'PERIODE_TIDAK_DITEMUKAN',
    'Periode akademik tidak ditemukan.');

  return ok({ ...r, cakupan: 'PRODI', programStudi: u.programStudi.nama });
}
