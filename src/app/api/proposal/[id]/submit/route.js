// POST /api/proposal/[id]/submit — kirim proposal
// Menerapkan mesin transisi: DRAFT | PERLU_REVISI -> MENUNGGU_VERIFIKASI_KAPRODI
import { prisma } from '@/lib/prisma';
import { proposalService, validasiFieldDinamis } from '@/modules/proposal/service';
import { cekTransisi, S } from '@/modules/proposal/stateMachine';
import { beritahu, kaprodiProdi, PESAN } from '@/modules/notifikasi/service';
import { catat, AKSI } from '@/modules/audit/service';
import { ok, fail, ctx } from '@/lib/api';
import { fromPrisma } from '@/lib/validate';

export async function POST(req, { params }) {
  const c = ctx(req);

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: {
      id: true, dosenId: true, status: true, jenis: true,
      judul: true, fieldTambahan: true, periode: { select: { isActive: true, nama: true } },
      _count: { select: { anggota: true } },
    },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  // Hanya ketua pengusul (atau ADMIN) yang boleh mengirim.
  if (p.dosenId !== c.userId && !c.hasRole('ADMIN')) {
    return fail(403, 'FORBIDDEN', 'Hanya ketua pengusul yang boleh mengirim proposal ini.');
  }

  // 1) Mesin transisi menolak status yang tidak sah.
  const t = cekTransisi({ dari: p.status, ke: S.MENUNGGU_KAPRODI, roles: c.roles });
  if (!t.boleh) return fail(409, 'TRANSISI_TIDAK_SAHIH', t.alasan);

  // 2) Periode masih aktif saat pengiriman.
  if (!p.periode?.isActive) {
    return fail(409, 'PERIODE_TIDAK_AKTIF',
      `Periode "${p.periode?.nama ?? '-'}" sudah tidak aktif. Proposal tidak bisa dikirim.`);
  }

  // 3) Validasi ulang field dinamis — pertahanan berlapis.
  //    Konfigurasi M8 bisa berubah sejak proposal dibuat.
  const vf = await validasiFieldDinamis({ jenis: p.jenis, fieldTambahan: p.fieldTambahan });
  if (!vf.boleh) {
    return fail(400, 'VALIDATION', vf.alasan, { field: vf.field, detail: vf.detail });
  }

  try {
    const baru = await prisma.proposals.update({
      where: { id: params.id },
      data: { status: S.MENUNGGU_KAPRODI },
      select: { id: true, judul: true, status: true, updatedAt: true,
                programStudiId: true },
    });

    // Efek samping: kabari Kaprodi prodi terkait + tinggalkan jejak audit.
    const penerima = await kaprodiProdi(baru.programStudiId);
    await beritahu(penerima, PESAN.submit(baru.judul));
    await catat({ proposalId: baru.id, userId: c.userId, aksi: AKSI.SUBMIT,
                  keterangan: `Proposal dikirim — status ${S.MENUNGGU_KAPRODI}.` });

    return ok({
      proposal: baru,
      message: `Proposal dikirim — menunggu verifikasi Kaprodi.`,
      langkahBerikut: 'Kaprodi TI/MI memverifikasi proposal ini.',
    });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Proposal' });
  }
}

export { proposalService };
