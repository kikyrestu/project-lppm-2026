// POST /api/proposal/[id]/review — reviewer menilai proposalnya
// GET  /api/proposal/[id]/review — reviewer melihat tugasnya (BLIND)
//
// ISOLASI BLIND: seluruh akses dibatasi `reviewerId = pengguna saat ini`.
// Tidak ada query yang membaca baris reviewer lain, sehingga nilai reviewer 2
// tidak pernah bisa disusupkan ke respons reviewer 1 — dan sebaliknya.
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { S } from '@/modules/proposal/stateMachine';
import { evaluateCombinedReviews } from '@/modules/review/tieBreaker';
import { beritahu, ketuaProposal, PESAN } from '@/modules/notifikasi/service';
import { catat, AKSI } from '@/modules/audit/service';
import { ok, fail, ctx } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';

const Nilai = z.object({
  skor: z.number().int().min(0).max(100),
  rekomendasi: z.enum(['TERIMA', 'REVISI', 'TOLAK']),
  catatan: z.string().trim().max(2000).optional(),
});

// Field proposal yang boleh dilihat reviewer untuk menilai.
// Nama relasi mengikuti skema: Proposals.dosen (DosenPengusul),
// ProposalMembers.user — bukan "pengusul"/"users".
const DETAIL_PROPOSAL = {
  id: true, judul: true, abstrak: true, jenis: true, anggaran: true,
  status: true, fieldTambahan: true, updatedAt: true,
  dosen: { select: { nidn: true, nama: true } },
  programStudi: { select: { kode: true, nama: true } },
  periode: { select: { nama: true } },
  anggota: { select: { user: { select: { nidn: true, nama: true } } } },
};

export async function POST(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('REVIEWER')) {
    return fail(403, 'FORBIDDEN', 'Penilaian khusus role REVIEWER.');
  }

  const v = parseBody(Nilai, await req.json().catch(() => null));
  if (!v.ok) return v.res;
  const d = v.data;

  // Baris reviewer INI SAJA — tidak pernah menyentuh baris reviewer lain.
  const milikSaya = await prisma.reviews.findFirst({
    where: { proposalId: params.id, reviewerId: c.userId },
    select: { id: true, urutanReviewer: true },
  });
  if (!milikSaya) {
    return fail(404, 'BUKAN_REVIEWER_PROPOSAL_INI', 'Anda tidak ditugaskan menilai proposal ini.');
  }

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: { id: true, judul: true, status: true },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');
  if (p.status !== S.MENUNGGU_REVIEW) {
    return fail(409, 'PENILAIAN_TIDAK_SAHIH',
      `Proposal berstatus ${p.status}. Penilaian hanya dibuka pada status ${S.MENUNGGU_REVIEW}.`);
  }

  try {
    await prisma.reviews.update({
      where: { id: milikSaya.id },
      data: { skor: d.skor, rekomendasi: d.rekomendasi, catatan: d.catatan ?? null },
    });

    // Hitung ulang hasil kombinasi dari DUA baris review milik proposal ini.
    // Nilai reviewer lain ikut terbaca di sini oleh sistem — bukan oleh reviewer.
    const semua = await prisma.reviews.findMany({
      where: { proposalId: params.id },
      select: { urutanReviewer: true, rekomendasi: true },
    });
    const gabung = semua.length === 2 && semua.every((r) => r.rekomendasi)
      ? evaluateCombinedReviews(semua) : null;

    // Efek samping — audit setiap penilaian, apa pun hasilnya.
    await catat({
      proposalId: params.id, userId: c.userId, aksi: AKSI.PENILAIAN,
      keterangan: `Reviewer ${milikSaya.urutanReviewer} menilai ${d.rekomendasi} (skor ${d.skor}).`,
    });

    if (gabung?.boleh) {
      // Kabari ketua pengusul begitu kedua nilai masuk dan status berubah.
      const ketua = await ketuaProposal(params.id);
      const pesan = gabung.perluRapat
        ? PESAN.perluKeputusan(p.judul)
        : PESAN.hasilReview(p.judul, gabung.statusTujuan);
      await beritahu(ketua, pesan);
      await catat({
        proposalId: params.id, userId: c.userId, aksi: AKSI.HASIL_KOMBINASI,
        keterangan: `${gabung.hasilKombinasi} -> status ${gabung.statusTujuan}. ${gabung.alasan}`,
      });
    }

    if (gabung?.boleh) {
      await prisma.$transaction([
        prisma.reviewEvaluations.upsert({
          where: { proposalId: params.id },
          create: { proposalId: params.id, hasilKombinasi: gabung.hasilKombinasi },
          update: { hasilKombinasi: gabung.hasilKombinasi, keputusanAkhir: null, diputuskanOleh: null },
        }),
        prisma.proposals.update({
          where: { id: params.id },
          data: { status: gabung.statusTujuan },
        }),
      ]);
    }

    return ok({
      nilaiSaya: { urutanReviewer: milikSaya.urutanReviewer, skor: d.skor, rekomendasi: d.rekomendasi },
      status: 'TERCATAT',
      menungguReviewerLain: !gabung?.boleh,
      ...(gabung?.boleh
        ? {
            hasilKombinasi: gabung.hasilKombinasi,
            keputusanAkhir: gabung.statusTujuan,
            alasan: gabung.alasan,
          }
        : { pesan: 'Nilai Anda tercatat. Menunggu Reviewer lain menyelesaikan penilaian.' }),
    });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Penilaian' });
  }
}

// Tampilan blind: reviewer melihat proposal + NILAINYA SENDIRI saja.
export async function GET(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('REVIEWER')) {
    return fail(403, 'FORBIDDEN', 'Tampilan review khusus role REVIEWER.');
  }

  // Hanya baris milik pengguna saat ini.
  const milikSaya = await prisma.reviews.findFirst({
    where: { proposalId: params.id, reviewerId: c.userId },
    select: { id: true, urutanReviewer: true, skor: true, rekomendasi: true, catatan: true },
  });
  if (!milikSaya) {
    return fail(404, 'BUKAN_REVIEWER_PROPOSAL_INI', 'Anda tidak ditugaskan menilai proposal ini.');
  }

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: DETAIL_PROPOSAL,
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  // Progres tanpa nilai & tanpa identitas reviewer lain.
  const progres = await prisma.reviews.findMany({
    where: { proposalId: params.id },
    select: { urutanReviewer: true, rekomendasi: true },
    orderBy: { urutanReviewer: 'asc' },
  });

  return ok({
    proposal: p,
    nilaiSaya: {
      urutanReviewer: milikSaya.urutanReviewer,
      skor: milikSaya.skor,
      rekomendasi: milikSaya.rekomendasi,
      catatan: milikSaya.catatan,
    },
    progres: progres.map((r) => ({ urutanReviewer: r.urutanReviewer, sudahMenilai: r.rekomendasi !== null })),
    blind: true,
    catatan: 'Sistem blind review: nilai reviewer lain tidak pernah disertakan dalam respons ini.',
  });
}
