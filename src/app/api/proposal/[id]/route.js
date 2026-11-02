// GET /api/proposal/[id] — detail proposal + anggota + riwayat status
import { prisma } from '@/lib/prisma';
import { proposalService } from '@/modules/proposal/service';
import { ok, fail, ctx } from '@/lib/api';

export async function GET(req, { params }) {
  const c = ctx(req);
  const p = await proposalService.byId(params.id);
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  // ADMIN selalu boleh.
  if (c.hasRole('ADMIN')) return lanjut();

  // KAPRODI hanya boleh membaca proposal milik studinya sendiri.
  if (c.hasRole('KAPRODI')) {
    const saya = await prisma.users.findUnique({
      where: { id: c.userId }, select: { programStudiId: true },
    });
    if (p.programStudiId !== saya?.programStudiId) {
      return fail(403, 'FORBIDDEN', 'Proposal ini bukan milik program studi Anda.');
    }
    return lanjut();
  }

  // DOSEN hanya boleh membaca proposal yang ia usulkan, ketuai, atau
  // menjadi anggotanya. Tanpa ini, siapa pun dengan role DOSEN dapat
  // membaca proposal orang lain hanya dengan mengetahui ID-nya.
  if (c.hasRole('DOSEN')) {
    const saya = await prisma.users.findUnique({
      where: { id: c.userId },
      select: {
        proposalsUsul: { select: { id: true } },
        anggotaTim: { select: { proposalId: true } },
      },
    });
    const pemilik = new Set([
      p.dosenId,
      ...(saya?.proposalsUsul ?? []).map((x) => x.id),
      ...(saya?.anggotaTim ?? []).map((x) => x.proposalId),
    ]);
    if (!pemilik.has(params.id)) {
      return fail(403, 'FORBIDDEN',
        'Proposal ini bukan milik Anda dan tidak dapat dibuka.');
    }
    return lanjut();
  }

  // REVIEWER hanya boleh membaca proposal yang ditugaskan kepadanya.
  if (c.hasRole('REVIEWER')) {
    const tugasan = await prisma.reviews.findFirst({
      where: { proposalId: params.id, reviewerId: c.userId },
      select: { id: true },
    });
    if (!tugasan) {
      return fail(403, 'FORBIDDEN',
        'Proposal ini tidak ditugaskan kepada Anda untuk dinilai.');
    }
    return lanjut();
  }

  // KETUA_STIKOM dan KETUA_LPPM memegang pengawasan institusional, sehingga
  // boleh membaca seluruh proposal walau tidak terlibat dalam verifikasinya.
  if (c.hasRole('KETUA_STIKOM') || c.hasRole('KETUA_LPPM')) {
    return lanjut();
  }

  // Role lain (PRODI) tidak berada dalam alur verifikasi proposal,
  // sehingga tidak berhak membaca isinya.
  return fail(403, 'FORBIDDEN',
    'Role Anda tidak memiliki akses membaca proposal.');

  async function lanjut() {
    const riwayat = await prisma.verifications.findMany({
      where: { proposalId: params.id },
      orderBy: { createdAt: 'asc' },
      select: {
        tahap: true, keputusan: true, catatan: true, createdAt: true,
        verifikator: { select: { nidn: true, nama: true } },
      },
    });
    return ok({ proposal: p, riwayat });
  }
}
