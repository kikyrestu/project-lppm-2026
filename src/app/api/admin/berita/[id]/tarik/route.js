// POST /api/admin/berita/[id]/tarik — cabut berita dari tayangan publik
// Berlaku untuk TERBIT maupun REVIEW; keduanya kembali menjadi DRAFT.
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';

const TAMPIL = {
  id: true, judul: true, kategori: true, gambar: true, status: true,
  publishedAt: true, createdAt: true,
  penulis: { select: { nidn: true, nama: true } },
};

export async function POST(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const p = await prisma.berita.findUnique({ where: { id: params.id } });
  if (!p) return fail(404, 'NOT_FOUND', 'Berita tidak ditemukan.');
  if (p.status === 'DRAFT') {
    return fail(409, 'TRANSISI_TIDAK_SAH', 'Berita sudah berstatus DRAFT.');
  }

  const r = await prisma.berita.update({
    where: { id: params.id },
    data: { status: 'DRAFT', publishedAt: null },
    select: TAMPIL,
  });
  return ok({ berita: r, message: 'Berita ditarik dan tidak lagi tayang.' });
}
