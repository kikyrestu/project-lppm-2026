// POST /api/admin/berita/[id]/ajukan — DRAFT -> REVIEW
// POST /api/admin/berita/[id]/terbit — REVIEW -> TERBIT (tayang di publik)
// POST /api/admin/berita/[id]/tarik  — TERBIT -> DRAFT (cabut dari publik)
//
// Pemisahan tahap inilah isi butir 8-3: penulis mengajukan, penerbit
// menerbitkan. Keduanya kegiatan terpisah sehingga tidak ada tulisan yang
// langsung tayang tanpa pemeriksaan.
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';

const SAH = {
  DRAFT: ['REVIEW'],
  REVIEW: ['TERBIT', 'DRAFT'],
  TERBIT: ['DRAFT'],
};
const TAMPIL = {
  id: true, judul: true, kategori: true, gambar: true, status: true,
  publishedAt: true, createdAt: true,
  penulis: { select: { nidn: true, nama: true } },
};

async function geser(req, { params }, ke, pesan) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const p = await prisma.berita.findUnique({ where: { id: params.id } });
  if (!p) return fail(404, 'NOT_FOUND', 'Berita tidak ditemukan.');
  if (!SAH[p.status]?.includes(ke)) {
    return fail(409, 'TRANSISI_TIDAK_SAH',
      `Berita berstatus ${p.status} tidak dapat diubah langsung menjadi ${ke}.`);
  }

  const r = await prisma.berita.update({
    where: { id: params.id },
    data: {
      status: ke,
      ...(ke === 'TERBIT' ? { publishedAt: new Date() } : {}),
      ...(ke === 'DRAFT'  ? { publishedAt: null } : {}),
    },
    select: TAMPIL,
  });
  return ok({ berita: r, message: pesan });
}

export const POST = (req, ctxArg) => geser(req, ctxArg, 'REVIEW',
  'Berita diajukan untuk ditinjau.');
