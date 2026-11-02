// GET /api/admin/kuisioner/[id]/hasil — ringkasan jawaban per pertanyaan
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';

export async function GET(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const k = await prisma.kuisioner.findUnique({
    where: { id: params.id },
    select: { id: true, judul: true, pertanyaan: true, status: true,
              _count: { select: { jawaban: true } } },
  });
  if (!k) return fail(404, 'NOT_FOUND', 'Kuisioner tidak ditemukan.');

  const jawab = await prisma.kuisionerResponse.findMany({
    where: { kuisionerId: k.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, namaPengisi: true, dataJawaban: true, createdAt: true },
  });

  const daftar = Array.isArray(k.pertanyaan) ? k.pertanyaan : [];
  const perPertanyaan = daftar.map((t) => {
    const nilai = jawab.map((j) => j.dataJawaban?.[t.kode]).filter((v) => v !== undefined);
    const frekuensi = {};
    // Pilihan ganda dan skala dihitung frekuensinya; isian dikumpulkan apa adanya.
    if (t.tipe === 'pilihan_ganda' || t.tipe === 'skala') {
      for (const v of nilai) {
        const kunci = String(v);
        frekuensi[kunci] = (frekuensi[kunci] ?? 0) + 1;
      }
    }
    return {
      kode: t.kode, pertanyaan: t.pertanyaan, tipe: t.tipe,
      jumlahDijawab: nilai.length,
      jumlahKosong: jawab.length - nilai.length,
      frekuensi: (t.tipe === 'pilihan_ganda' || t.tipe === 'skala') ? frekuensi : null,
      contohJawaban: t.tipe.startsWith('isian') ? nilai.slice(0, 5) : null,
    };
  });

  return ok({
    kuisioner: { id: k.id, judul: k.judul, status: k.status },
    jumlahPengisi: jawab.length,
    perPertanyaan,
  });
}
