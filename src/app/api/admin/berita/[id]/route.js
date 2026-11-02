// PATCH /api/admin/berita/[id] — sunting isi berita
// Isi hanya boleh disunting selama belum tayang; berita TERBIT harus
// ditarik lebih dulu sebelum diedit, agar versi yang tayang tidak berubah
// diam-diam di bawah kaki pembaca.
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';
import { z } from 'zod';

const skema = z.object({
  judul: z.string().min(1, 'Judul wajib diisi.').max(255),
  konten: z.string().min(1, 'Konten wajib diisi.'),
  kategori: z.string().max(100).nullish(),
  gambar: z.string().max(255).nullish(),
});

const TAMPIL = {
  id: true, judul: true, kategori: true, gambar: true, status: true,
  publishedAt: true, createdAt: true,
  penulis: { select: { nidn: true, nama: true } },
};

export async function PATCH(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const p = await prisma.berita.findUnique({ where: { id: params.id } });
  if (!p) return fail(404, 'NOT_FOUND', 'Berita tidak ditemukan.');

  if (p.status === 'TERBIT') {
    return fail(409, 'SUDAH_TAYANG',
      'Berita yang sudah terbit tidak dapat disunting. Tarik dulu ke DRAFT.');
  }

  const { ok: lolos, data: d, res } = parseBody(skema.partial(), await req.json());
  if (!lolos) return res;

  try {
    const r = await prisma.berita.update({
      where: { id: params.id },
      data: {
        ...(d.judul !== undefined ? { judul: d.judul } : {}),
        ...(d.konten !== undefined ? { konten: d.konten } : {}),
        ...(d.kategori !== undefined ? { kategori: d.kategori } : {}),
        ...(d.gambar !== undefined ? { gambar: d.gambar } : {}),
      },
      select: TAMPIL,
    });
    return ok({ berita: r, message: 'Berita diperbarui.' });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Berita' });
  }
}
