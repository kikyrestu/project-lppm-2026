// POST /api/proposal/[id]/keputusan — keputusan rapat offline (tie-breaker)
// GET  /api/proposal/[id]/keputusan — baca hasil evaluasi
//
// Diperlukan HANYA pada skenario sengketa TERIMA+TOLAK, ketika mesin
// evaluateCombinedReviews menetapkan status PERLU_KEPUTUSAN dan tidak
// ada keputusan otomatis. Keputusan diambil rapat oleh ADMIN bersama KAPRODI.
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { S, cekTransisi } from '@/modules/proposal/stateMachine';
import { ok, fail, ctx } from '@/lib/api';
import { beritahu, ketuaProposal, PESAN } from '@/modules/notifikasi/service';
import { catat, AKSI } from '@/modules/audit/service';
import { parseBody, fromPrisma } from '@/lib/validate';

// Keputusan rapat memetakan ke status proposal.
const KEPUTUSAN_RAPAT = { LOLOS: S.LOLOS, REVISI: S.PERLU_REVISI, DITOLAK: S.DITOLAK };

const Putusan = z.object({
  keputusanAkhir: z.enum(Object.keys(KEPUTUSAN_RAPAT)),
  catatan: z.string().trim().max(2000).optional(),
});

export async function POST(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) {
    return fail(403, 'FORBIDDEN', 'Keputusan rapat offline khusus role ADMIN.');
  }

  const v = parseBody(Putusan, await req.json().catch(() => null));
  if (!v.ok) return v.res;
  const d = v.data;

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: { id: true, judul: true, status: true },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  if (p.status !== S.PERLU_KEPUTUSAN) {
    return fail(409, 'PUTUSAN_TIDAK_DIPERLUKAN',
      `Proposal berstatus ${p.status}. Rapat offline hanya untuk skenario ${S.PERLU_KEPUTUSAN} (reviewer berselisih).`);
  }

  const ev = await prisma.reviewEvaluations.findUnique({ where: { proposalId: p.id } });
  if (!ev) return fail(404, 'EVALUASI_TIDAK_DITEMUKAN', 'Hasil kombinasi reviewer belum terbentuk.');
  if (ev.hasilKombinasi !== 'TERIMA_TOLAK') {
    return fail(409, 'SKENARIO_SALAH',
      `Skenario ${ev.hasilKombinasi} sudah diputuskan otomatis dan tidak memerlukan rapat.`);
  }

  const statusTujuan = KEPUTUSAN_RAPAT[d.keputusanAkhir];
  const t = cekTransisi({ dari: p.status, ke: statusTujuan, roles: c.roles });
  if (!t.boleh) return fail(409, 'TRANSISI_TIDAK_SAHIH', t.alasan);

  try {
    const [evaluasi, proposal] = await prisma.$transaction([
      prisma.reviewEvaluations.update({
        where: { id: ev.id },
        data: { keputusanAkhir: d.keputusanAkhir, diputuskanOleh: c.userId, catatan: d.catatan ?? null },
        select: {
          id: true, hasilKombinasi: true, keputusanAkhir: true, catatan: true,
          diputuskanOleh: true, pejabat: { select: { nidn: true, nama: true } },
        },
      }),
      prisma.proposals.update({
        where: { id: p.id },
        data: { status: statusTujuan },
        select: { id: true, judul: true, status: true, updatedAt: true },
      }),
    ]);

    // Efek samping: kabari ketua bahwa rapat sudah memutuskan.
    const ketua = await ketuaProposal(p.id);
    await beritahu(ketua, PESAN.keputusanRapat(p.judul, d.keputusanAkhir));
    await catat({
      proposalId: p.id, userId: c.userId, aksi: AKSI.KEPUTUSAN_RAPAT,
      keterangan: `Rapat offline memutuskan ${d.keputusanAkhir}${d.catatan ? ` — ${d.catatan}` : ''}.`,
    });

    return ok({
      evaluasi, proposal,
      message: `Keputusan rapat offline dicatat: ${d.keputusanAkhir}. Proposal kini berstatus ${proposal.status}.`,
    });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Keputusan' });
  }
}

export async function GET(req, { params }) {
  const c = ctx(req);
  if (!c.userId) return fail(401, 'UNAUTHENTICATED', 'Sesi tidak ditemukan.');

  const ev = await prisma.reviewEvaluations.findUnique({
    where: { proposalId: params.id },
    select: {
      id: true, hasilKombinasi: true, keputusanAkhir: true, catatan: true, createdAt: true,
      pejabat: { select: { nidn: true, nama: true } },
    },
  });
  if (!ev) return ok({ evaluasi: null, pesan: 'Belum ada hasil kombinasi reviewer untuk proposal ini.' });

  // Kepentingan penasaran: nilai rinci hanya untuk ADMIN & KAPRODI.
  const bolehRinci = c.hasRole('ADMIN') || c.hasRole('KAPRODI');
  const detail = bolehRinci
    ? await prisma.reviews.findMany({
        where: { proposalId: params.id },
        orderBy: { urutanReviewer: 'asc' },
        select: {
          urutanReviewer: true, skor: true, rekomendasi: true, catatan: true,
          reviewer: { select: { nidn: true, nama: true } },
        },
      })
    : undefined;

  return ok({ evaluasi: ev, ...(bolehRinci ? { detail } : {}) });
}
