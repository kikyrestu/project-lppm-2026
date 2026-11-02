// POST /api/admin/berita/[id]/terbit — REVIEW -> TERBIT (tayang di publik)
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
  // Lompatan DRAFT -> TERBIT ditolak: tinjauan mendahului terbit.
  if (p.status !== 'REVIEW') {
    return fail(409, 'TRANSISI_TIDAK_SAH',
      `Berita berstatus ${p.status}. Terbit hanya boleh dari REVIEW.`);
  }

  const r = await prisma.berita.update({
    where: { id: params.id },
    data: { status: 'TERBIT', publishedAt: new Date() },
    select: TAMPIL,
  });
  return ok({ berita: r, message: 'Berita terbit dan tayang di publik.' });
}
