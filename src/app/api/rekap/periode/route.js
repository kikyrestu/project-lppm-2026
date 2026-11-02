// GET /api/rekap/periode — daftar periode akademik untuk filter rekap.
// Dipisah sebagai endpoint sendiri supaya dropdown terisi tanpa harus
// memanggil rekap utama lebih dulu.
import { daftarPeriode } from '@/modules/rekap/service';
import { ok, fail, ctx } from '@/lib/api';

export async function GET(req) {
  const c = ctx(req);
  if (!c.userId) return fail(401, 'UNAUTHENTICATED', 'Sesi tidak ditemukan.');

  const daftar = await daftarPeriode();
  return ok({ periode: daftar, jumlah: daftar.length });
}
