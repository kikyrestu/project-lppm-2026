// PATCH  /api/admin/kuisioner/[id]        — ubah judul/deskripsi/pertanyaan
// POST   /api/admin/kuisioner/[id]/aktifkan   — buka untuk diisi
// POST   /api/admin/kuisioner/[id]/selesaikan — tutup penerimaan jawaban
// DELETE /api/admin/kuisioner/[id]        — hapus (bila belum ada jawaban)
// GET    /api/admin/kuisioner/[id]/hasil  — ringkasan jawaban
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

const tanya = z.object({
  kode: z.string().min(1).max(40),
  pertanyaan: z.string().min(1).max(500),
  tipe: z.enum(['pilihan_ganda', 'skala', 'isian_pendek', 'isian_panjang']),
  pilihan: z.array(z.string().max(200)).max(50).optional(),
  wajib: z.boolean().optional(),
});

/** Ambil satu kuisioner lengkap dengan jumlah jawabannya. */
async function ambil(params) {
  return prisma.kuisioner.findUnique({
    where: { id: params.id }, select: TAMPIL,
  });
}

export async function PATCH(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const k = await prisma.kuisioner.findUnique({
    where: { id: params.id }, select: TAMPIL,
  });
  if (!k) return fail(404, 'NOT_FOUND', 'Kuisioner tidak ditemukan.');

  // Pertanyaan tidak boleh disunting bila sudah ada jawaban masuk —
  // jawaban lama akan kehilangan artinya.
  if (k._count.jawaban > 0) {
    return fail(409, 'SUDAH_ADA_JAWABAN',
      `Kuisioner sudah diisi ${k._count.jawaban} orang dan tidak dapat disunting.`);
  }

  const { ok: lolos, data: d, res } = parseBody(
    z.object({
      judul: z.string().min(1).max(200),
      deskripsi: z.string().nullish(),
      pertanyaan: z.array(tanya).max(100),
    }).partial(),
    await req.json());
  if (!lolos) return res;

  try {
    const r = await prisma.kuisioner.update({
      where: { id: params.id },
      data: {
        ...(d.judul !== undefined ? { judul: d.judul } : {}),
        ...(d.deskripsi !== undefined ? { deskripsi: d.deskripsi } : {}),
        ...(d.pertanyaan !== undefined ? { pertanyaan: d.pertanyaan } : {}),
      },
      select: TAMPIL,
    });
    return ok({ kuisioner: r, message: 'Kuisioner diperbarui.' });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Kuisioner' });
  }
}

export async function DELETE(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const k = await ambil(params);
  if (!k) return fail(404, 'NOT_FOUND', 'Kuisioner tidak ditemukan.');
  // Jawaban adalah data pengumpulan; menghapus kuisioner berarti membuangnya.
  if (k._count.jawaban > 0) {
    return fail(409, 'SUDAH_ADA_JAWABAN',
      `Kuisioner sudah diisi ${k._count.jawaban} orang dan tidak dapat dihapus.`);
  }

  try {
    await prisma.kuisioner.delete({ where: { id: params.id } });
    return ok({ terhapus: true, message: 'Kuisioner dihapus.' });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Kuisioner' });
  }
}
