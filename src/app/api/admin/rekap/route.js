// GET /api/admin/rekap           — rekap eksekutif (khusus ADMIN)
// GET /api/prodi/rekap           — rekap untuk prodi sendiri (khusus KAPRODI)
//
// Keduanya memakai agregat yang sama; perbedaannya hanya pada pembatasan.
// Kaprodi tidak pernah bisa melihat angka prodi lain — `programStudiId`
// diturunkan dari akunnya sendiri, bukan dari parameter klien.
import { rekap } from '@/modules/rekap/service';
import { ok, fail, ctx } from '@/lib/api';

const P = (req) => new URL(req.url).searchParams;

async function jawab(req, programStudiId) {
  const q = P(req);
  const r = await rekap({
    periodeId: q.get('periodeId') || undefined,
    tahunAkademik: q.get('tahunAkademik') || undefined,
    programStudiId,
  });
  if (!r) return fail(404, 'PERIODE_TIDAK_DITEMUKAN',
    'Periode akademik tidak ditemukan. Pilih dari daftar /api/rekap/periode.');
  return ok({ ...r, cakupan: programStudiId ? 'PRODI' : 'SEMUA_PRODI' });
}

export async function GET(req) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) {
    return fail(403, 'FORBIDDEN', 'Rekap eksekutif khusus role ADMIN.');
  }
  return jawab(req, null);
}
