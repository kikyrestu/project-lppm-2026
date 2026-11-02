// GET /api/public/berita/[id] — rincian satu berita (tanpa login)
// Hanya berita berstatus TERBIT yang bisa dibuka. ID berita DRAFT/REVIEW
// menghasilkan 404 — bukan 403 — sehingga tidak membocorkan keberadaannya.
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';

export async function GET(req, { params }) {
  const b = await prisma.berita.findUnique({
    where: { id: params.id },
    select: {
      status: true,
      id: true, judul: true, konten: true, kategori: true, gambar: true,
      publishedAt: true, createdAt: true,
      penulis: { select: { nama: true } },
    },
  });

  if (!b || b.status !== 'TERBIT') {
    return fail(404, 'NOT_FOUND', 'Berita tidak ditemukan.');
  }
  return ok({ berita: b });
}
