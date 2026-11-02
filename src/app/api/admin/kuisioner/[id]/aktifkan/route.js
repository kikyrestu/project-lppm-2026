// POST /api/admin/kuisioner/[id]/aktifkan — buka kuisioner untuk diisi publik
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';

const SAH = { DRAFT: ['AKTIF'], SELESAI: ['AKTIF'] };
const TAMPIL = {
  id: true, judul: true, deskripsi: true, pertanyaan: true,
  status: true, createdAt: true, updatedAt: true,
  pembuat: { select: { nidn: true, nama: true } },
  _count: { select: { jawaban: true } },
};

export async function POST(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const k = await prisma.kuisioner.findUnique({
    where: { id: params.id }, select: TAMPIL,
  });
  if (!k) return fail(404, 'NOT_FOUND', 'Kuisioner tidak ditemukan.');
  if (!SAH[k.status]?.includes('AKTIF')) {
    return fail(409, 'TRANSISI_TIDAK_SAH',
      `Kuisioner berstatus ${k.status} tidak dapat dibuka.`);
  }
  // Aktif tanpa pertanyaan tidak berguna bagi pengisi.
  if (!(Array.isArray(k.pertanyaan) && k.pertanyaan.length)) {
    return fail(409, 'BELUM_ADA_PERTANYAAN',
      'Kuisioner belum memiliki pertanyaan dan tidak dapat dibuka untuk diisi.');
  }

  const r = await prisma.kuisioner.update({
    where: { id: params.id }, data: { status: 'AKTIF' }, select: TAMPIL,
  });
  return ok({ kuisioner: r, message: 'Kuisioner dibuka untuk diisi publik.' });
}
