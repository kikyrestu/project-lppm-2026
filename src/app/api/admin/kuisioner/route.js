// GET    /api/admin/kuisioner          — daftar semua kuisioner (ADMIN)
// POST   /api/admin/kuisioner          — buat kuisioner baru (DRAFT)
// PATCH  /api/admin/kuisioner/[id]     — ubah judul/deskripsi/pertanyaan
// POST   /api/admin/kuisioner/[id]/aktifkan   — DRAFT/SELESAI -> AKTIF
// POST   /api/admin/kuisioner/[id]/selesaikan — AKTIF -> SELESAI
// DELETE /api/admin/kuisioner/[id]     — hapus (bila belum ada jawaban)
//
// Daftar pertanyaan disimpan sebagai JSON array, bukan tabel relasional —
// bentuk pertanyaan bisa berubah (pilihan ganda, skala Likert, isian panjang)
// sehingga skema kolom tetap tidak akan pernah muat.
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';
import { z } from 'zod';

const TAMPIL = {
  id: true, judul: true, deskripsi: true, pertanyaan: true,
  status: true, createdAt: true, updatedAt: true,
  pembuat: { select: { nidn: true, nama: true } },
  _count: { select: { jawaban: true } },
};

// Bentuk minimal sebuah pertanyaan. Isi bebas, tetapi kunci ini wajib ada
// supaya antarmuka tidak menebak.
const tanya = z.object({
  kode: z.string().min(1).max(40),
  pertanyaan: z.string().min(1).max(500),
  tipe: z.enum(['pilihan_ganda', 'skala', 'isian_pendek', 'isian_panjang']),
  pilihan: z.array(z.string().max(200)).max(50).optional(),
  wajib: z.boolean().optional(),
});

export async function GET(req) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const daftar = await prisma.kuisioner.findMany({
    orderBy: { createdAt: 'desc' },
    select: TAMPIL,
  });
  const hitung = await prisma.kuisioner.groupBy({ by: ['status'], _count: { _all: true } });
  return ok({
    kuisioner: daftar,
    jumlah: daftar.length,
    perStatus: Object.fromEntries(hitung.map((h) => [h.status, h._count._all])),
  });
}

const skema = z.object({
  judul: z.string().min(1, 'Judul wajib diisi.').max(200),
  deskripsi: z.string().nullish(),
  pertanyaan: z.array(tanya).max(100).optional(),
});

export async function POST(req) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const { ok: lolos, data: d, res } = parseBody(skema, await req.json());
  if (!lolos) return res;

  const salah = cekBentuk(d.pertanyaan ?? []);
  if (salah) return fail(400, 'PERTANYAAN_TIDAK_SAH', salah);

  try {
    const baru = await prisma.kuisioner.create({
      data: {
        judul: d.judul, deskripsi: d.deskripsi ?? null,
        pertanyaan: d.pertanyaan ?? [], status: 'DRAFT', dibuatOleh: c.userId,
      },
      select: TAMPIL,
    });
    return ok({ kuisioner: baru, message: 'Kuisioner dibuat sebagai DRAFT.' });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Kuisioner' });
  }
}

/**
 * Pilihan wajib diisi untuk tipe pilihan_gdan, dan dilarang untuk tipe lain.
 * Tanpa ini, kuisioner pilihan ganda bisa terbit tanpa satu pun pilihan —
 * pengisi tidak akan bisa menjawab.
 */
function cekBentuk(daftar) {
  for (const t of daftar) {
    if (t.tipe === 'pilihan_ganda') {
      if (!t.pilihan?.length) {
        return `Pertanyaan "${t.pertanyaan}" bertipe pilihan_ganda tetapi tidak memiliki pilihan.`;
      }
    } else if (t.pilihan?.length) {
      return `Pertanyaan "${t.pertanyaan}" bertipe ${t.tipe} tidak seharusnya memiliki pilihan.`;
    }
  }
  return null;
}
