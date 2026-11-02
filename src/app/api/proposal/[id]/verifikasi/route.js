// POST /api/proposal/[id]/verifikasi — verifikasi berjenjang Kaprodi -> Admin
// Tahap ditentukan dari status proposal, bukan dari body permintaan,
// sehingga klien tidak dapat melompati tahap.
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validasiVerifikasi, catatVerifikasi, KEPUTUSAN } from '@/modules/verifikasi/service';
import { beritahu, ketuaProposal, PESAN } from '@/modules/notifikasi/service';
import { catat, AKSI } from '@/modules/audit/service';
import { ok, fail, ctx } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';

const Verifikasi = z.object({
  keputusan: z.enum(Object.values(KEPUTUSAN)),
  catatan: z.string().trim().max(2000).optional(),
});

export async function POST(req, { params }) {
  const c = ctx(req);
  if (!c.userId) return fail(401, 'UNAUTHENTICATED', 'Sesi tidak ditemukan.');

  const v = parseBody(Verifikasi, await req.json().catch(() => null));
  if (!v.ok) return v.res;
  const d = v.data;

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: { id: true, judul: true, status: true, jenis: true },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  const hasil = await validasiVerifikasi({
    proposal: p,
    keputusan: d.keputusan,
    catatan: d.catatan,
    roles: c.roles,
  });
  if (!hasil.boleh) return fail(403, 'VERIFIKASI_TIDAK_SAHIH', hasil.alasan);

  try {
    const r = await catatVerifikasi({
      proposal: { ...p, __tahap: hasil.tahap, __statusTujuan: hasil.statusTujuan },
      keputusan: d.keputusan,
      catatan: d.catatan,
      userId: c.userId,
    });

    // Efek samping — isi pesan mengikuti keputusan & tahap.
    const ketua = await ketuaProposal(p.id);
    const namaTahap = hasil.tahap === 'KAPRODI' ? 'Kaprodi' : 'Admin LPPM';
    let pesan;
    if (d.keputusan === KEPUTUSAN.SETUJUI) {
      pesan = hasil.tahap === 'KAPRODI'
        ? PESAN.verifikasiKaprodiSetuju(p.judul)
        : PESAN.masukReview(p.judul);
    } else if (d.keputusan === KEPUTUSAN.REVISI) {
      pesan = PESAN.verifikasiRevisi(p.judul, namaTahap);
    } else {
      pesan = PESAN.verifikasiTolak(p.judul, namaTahap);
    }
    await beritahu(ketua, pesan);
    await catat({
      proposalId: p.id, userId: c.userId, aksi: AKSI.VERIFIKASI,
      keterangan: `Tahap ${hasil.tahap}: ${d.keputusan}${d.catatan ? ` — ${d.catatan}` : ''} (status ${r.proposal.status}).`,
    });

    return ok({
      verifikasi: r.verifikasi,
      proposal: r.proposal,
      tahap: hasil.tahap,
      message: `Verifikasi tahap ${hasil.tahap} dicatat (${d.keputusan}). Proposal kini berstatus ${r.proposal.status}.`,
    });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Verifikasi' });
  }
}

// Riwayat verifikasi — hanya ADMIN & KAPRODI yang boleh melihat keputusan.
export async function GET(req, { params }) {
  const c = ctx(req);
  if (!c.userId) return fail(401, 'UNAUTHENTICATED', 'Sesi tidak ditemukan.');
  if (!c.hasRole('ADMIN') && !c.hasRole('KAPRODI')) {
    return fail(403, 'FORBIDDEN', 'Riwayat verifikasi hanya untuk ADMIN dan KAPRODI.');
  }

  const daftar = await prisma.verifications.findMany({
    where: { proposalId: params.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, tahap: true, keputusan: true, catatan: true, createdAt: true,
      verifikator: { select: { nidn: true, nama: true } },
    },
  });
  return ok({ jumlah: daftar.length, riwayat: daftar });
}
