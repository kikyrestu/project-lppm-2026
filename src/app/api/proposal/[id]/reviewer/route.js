// POST /api/proposal/[id]/reviewer — tugaskan Reviewer 1 & Reviewer 2
// Kolom urutan_reviewer (1|2) menggantikan kolom lama reviewer2_id yang bermasalah:
// satu reviewer dapat menilai banyak proposal tanpa harus mencocokkan baris.
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { S, cekTransisi } from '@/modules/proposal/stateMachine';
import { ok, fail, ctx } from '@/lib/api';
import { beritahu, PESAN } from '@/modules/notifikasi/service';
import { catat, AKSI } from '@/modules/audit/service';
import { parseBody, fromPrisma } from '@/lib/validate';

const Tugaskan = z.object({
  // tepat 2 entri: urutanReviewer 1 dan 2, berbeda orang
  reviewer: z.array(z.object({
    urutanReviewer: z.number().int().refine((n) => n === 1 || n === 2, 'urutanReviewer harus 1 atau 2'),
    nidn: z.string().trim().min(1),
  })).length(2),
});

export async function POST(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) {
    return fail(403, 'FORBIDDEN', 'Penugasan reviewer khusus role ADMIN.');
  }

  const v = parseBody(Tugaskan, await req.json().catch(() => null));
  if (!v.ok) return v.res;
  const daftar = v.data.reviewer;

  // urutan harus 1 dan 2 — tidak boleh dua kali urutan yang sama
  const urutan = daftar.map((r) => r.urutanReviewer).sort().join(',');
  if (urutan !== '1,2') {
    return fail(400, 'VALIDATION', 'Penugasan harus memuat urutanReviewer 1 dan 2.');
  }

  // kedua reviewer harus orang berbeda
  const nidn = daftar.map((r) => r.nidn);
  if (nidn[0] === nidn[1]) {
    return fail(400, 'VALIDATION', 'Reviewer 1 dan Reviewer 2 harus orang yang berbeda.');
  }

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: { id: true, judul: true, status: true, dosenId: true, programStudiId: true },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  const t = cekTransisi({ dari: p.status, ke: S.PERLU_KEPUTUSAN, roles: c.roles });
  // Penugasan hanya boleh saat proposal sudah lolos verifikasi 2 tahap.
  if (p.status !== S.MENUNGGU_REVIEW) {
    return fail(409, 'PENUGASAN_TIDAK_SAHIH',
      `Proposal berstatus ${p.status}. Penugasan reviewer hanya dapat dilakukan setelah verifikasi Kaprodi dan Admin disetujui (status ${S.MENUNGGU_REVIEW}).`);
  }

  // Reviewer tidak boleh menilai proposal miliknya sendiri, dan wajib ber-role REVIEWER.
  // UserRoles.role adalah enum skalar RoleName, bukan relasi ke tabel terpisah.
  const pengguna = await prisma.users.findMany({
    where: { nidn: { in: nidn } },
    select: {
      id: true, nidn: true, nama: true, programStudiId: true,
      roles: { select: { role: true } },
    },
  });

  for (const r of daftar) {
    const u = pengguna.find((x) => x.nidn === r.nidn);
    if (!u) return fail(404, 'PENGGUNA_TIDAK_DITEMUKAN', `NIDN ${r.nidn} tidak terdaftar.`);
    if (u.id === p.dosenId) {
      return fail(409, 'REVIEWER_KONFLIK_KEPENTINGAN', `NIDN ${r.nidn} adalah pengusul proposal ini.`);
    }
    const roles = u.roles.map((x) => x.role);
    if (!roles.includes('REVIEWER')) {
      return fail(409, 'BUKAN_REVIEWER', `NIDN ${r.nidn} tidak memiliki role REVIEWER.`);
    }
  }

  try {
    const hasil = await prisma.$transaction(async (tx) => {
      const out = [];
      for (const r of daftar) {
        const u = pengguna.find((x) => x.nidn === r.nidn);
        out.push(await tx.reviews.upsert({
          where: {
            proposalId_urutanReviewer: { proposalId: p.id, urutanReviewer: r.urutanReviewer },
          },
          create: { proposalId: p.id, reviewerId: u.id, urutanReviewer: r.urutanReviewer },
          update: { reviewerId: u.id },
          select: {
            id: true, urutanReviewer: true, skor: true, rekomendasi: true,
            // reviewerId wajib ikut dipilih — dipakai sebagai penerima notifikasi.
            reviewerId: true,
            reviewer: { select: { nidn: true, nama: true } },
          },
        }));
      }
      return out;
    });

    // Efek samping: kabari tiap reviewer yang baru ditugaskan.
    for (const h of hasil) {
      await beritahu(h.reviewerId, PESAN.ditugaskanReviewer(p.judul, h.urutanReviewer));
    }
    await catat({
      proposalId: p.id, userId: c.userId, aksi: AKSI.PENUGASAN_REVIEWER,
      keterangan: `Reviewer 1 & 2 ditugaskan: ${daftar.map((r) => r.nidn).join(', ')}.`,
    });

    return ok({
      proposal: { id: p.id, judul: p.judul, status: p.status },
      reviewer: hasil,
      message: 'Reviewer 1 dan Reviewer 2 ditugaskan.',
      catatan: 'Sistem blind review: kedua reviewer tidak dapat melihat nilai satu sama lain.',
    }, { status: 201 });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Penugasan' });
  }
}

export async function GET(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) {
    return fail(403, 'FORBIDDEN', 'Daftar penugasan reviewer khusus ADMIN.');
  }
  const daftar = await prisma.reviews.findMany({
    where: { proposalId: params.id },
    orderBy: { urutanReviewer: 'asc' },
    select: {
      id: true, urutanReviewer: true, skor: true, rekomendasi: true,
      reviewer: { select: { nidn: true, nama: true } },
    },
  });
  return ok({ jumlah: daftar.length, penugasan: daftar });
}
