// GET    /api/admin/berita           — daftar berita (filter status)
// POST   /api/admin/berita           — tulis berita (DRAFT)
// PATCH  /api/admin/berita/[id]      — ubah isi
// POST   /api/admin/berita/[id]/ajukan   — DRAFT -> REVIEW
// POST   /api/admin/berita/[id]/terbit   — REVIEW -> TERBIT
// POST   /api/admin/berita/[id]/tarik    — TERBIT -> DRAFT
//
// Alur berjenjang: penulis tidak bisa menerbitkan tulisannya sendiri.
// DRAFT hanya terlihat oleh sesama ADMIN; publik hanya melihat TERBIT.
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';
import { z } from 'zod';

// Keadaan yang boleh dilalui, agar tidak ada lompatan liar.
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

export async function GET(req) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const q = new URL(req.url).searchParams;
  const status = q.get('status');
  const daftar = await prisma.berita.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    select: TAMPIL,
  });
  const hitung = await prisma.berita.groupBy({ by: ['status'], _count: { _all: true } });
  return ok({
    berita: daftar,
    jumlah: daftar.length,
    perStatus: Object.fromEntries(hitung.map((h) => [h.status, h._count._all])),
  });
}

const skema = z.object({
  judul: z.string().min(1, 'Judul wajib diisi.').max(255),
  konten: z.string().min(1, 'Konten wajib diisi.'),
  kategori: z.string().max(100).nullish(),
  gambar: z.string().max(255).nullish(),
});

export async function POST(req) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const { ok: lolos, data: d, res } = parseBody(skema, await req.json());
  if (!lolos) return res;

  try {
    const baru = await prisma.berita.create({
      data: {
        judul: d.judul, konten: d.konten, kategori: d.kategori ?? null,
        gambar: d.gambar ?? null, status: 'DRAFT', penulisId: c.userId,
      },
      select: TAMPIL,
    });
    return ok({ berita: baru, message: 'Berita disimpan sebagai DRAFT.' });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Berita' });
  }
}

/** Geser status dengan pemeriksaan transisi. */
async function geser(params, c, ke, pesan) {
  const p = await prisma.berita.findUnique({ where: { id: params.id } });
  if (!p) return fail(404, 'NOT_FOUND', 'Berita tidak ditemukan.');

  // TERBIT = tayang di publik; hanya ADMIN yang boleh menggeser ke situ.
  if (!SAH[p.status]?.includes(ke)) {
    return fail(409, 'TRANSISI_TIDAK_SAH',
      `Berita berstatus ${p.status} tidak dapat diubah langsung menjadi ${ke}.`);
  }

  const r = await prisma.berita.update({
    where: { id: params.id },
    data: {
      status: ke,
      ...(ke === 'TERBIT' ? { publishedAt: new Date() } : {}),
      ...(ke === 'DRAFT' ? { publishedAt: null } : {}),
    },
    select: TAMPIL,
  });
  return ok({ berita: r, message: pesan });
}
