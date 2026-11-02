// src/modules/verifikasi/service.js
// Verifikasi berjenjang: Kaprodi(TI/MI) -> Admin LPPM.
// Pesanan ketat — sumber kebenaran: use-case narrative.
//   * KAPRODI hanya boleh menyetujui tahap KAPRODI
//   * ADMIN hanya boleh menyetujui tahap ADMIN, dan hanya setelah tahap Kaprodi selesai
//   * catatan WAJIB diisi saat keputusan REVISI atau TOLAK

import { prisma } from '@/lib/prisma';
import { cekTransisi, S } from '@/modules/proposal/stateMachine';

export const KEPUTUSAN = { SETUJUI: 'SETUJUI', REVISI: 'REVISI', TOLAK: 'TOLAK' };

// Keputusan -> status tujuan pada mesin transisi.
const KEPUTUSAN_KE_STATUS = {
  SETUJUI: { KAPRODI: S.MENUNGGU_ADMIN, ADMIN: S.MENUNGGU_REVIEW },
  REVISI: { KAPRODI: S.PERLU_REVISI, ADMIN: S.PERLU_REVISI },
  TOLAK: { KAPRODI: S.DITOLAK, ADMIN: S.DITOLAK },
};

// Status yang menandai proposal sedang menunggu tahap tertentu.
const STATUS_MENUNGGU = { KAPRODI: S.MENUNGGU_KAPRODI, ADMIN: S.MENUNGGU_ADMIN };

/**
 * Validasi permintaan verifikasi tanpa menyentuh tulis data.
 * @returns {{boleh:boolean, alasan?:string, statusTujuan?:string}}
 */
export async function validasiVerifikasi({ proposal, keputusan, catatan, roles }) {
  if (!Object.values(KEPUTUSAN).includes(keputusan)) {
    return {
      boleh: false,
      alasan: `Keputusan tidak sah: "${keputusan}". Pilihan: ${Object.values(KEPUTUSAN).join(', ')}.`,
    };
  }

  // Tahap ditentukan dari status proposal, bukan dari input klien.
  const tahap = proposal.status === S.MENUNGGU_ADMIN ? 'ADMIN'
    : proposal.status === S.MENUNGGU_KAPRODI ? 'KAPRODI' : null;

  if (!tahap) {
    return {
      boleh: false,
      alasan: `Proposal berstatus ${proposal.status} dan tidak sedang menunggu verifikasi. Tahap aktif hanya saat ${STATUS_MENUNGGU.KAPRODI} atau ${STATUS_MENUNGGU.ADMIN}.`,
    };
  }

  // Role harus sesuai tahap: Kaprodi memverifikasi tahap KAPRODI, Admin tahap ADMIN.
  const roleTahap = { KAPRODI: 'KAPRODI', ADMIN: 'ADMIN' };
  if (!roles.includes(roleTahap[tahap])) {
    return {
      boleh: false,
      alasan: `Tahap ${tahap} khusus role ${roleTahap[tahap]}. Role Anda: ${roles.join(', ') || '(kosong)'}.`,
    };
  }

  // Catatan wajib saat minta revisi atau menolak.
  if ((keputusan === KEPUTUSAN.REVISI || keputusan === KEPUTUSAN.TOLAK) && !catatan?.trim()) {
    return { boleh: false, alasan: `Catatan wajib diisi saat keputusan ${keputusan}.` };
  }

  // Tahap ADMIN hanya sah setelah tahap KAPRODI tercatat SETUJUI.
  if (tahap === 'ADMIN') {
    const kaprodi = await prisma.verifications.findUnique({
      where: { proposalId_tahap: { proposalId: proposal.id, tahap: 'KAPRODI' } },
      select: { keputusan: true },
    });
    if (!kaprodi || kaprodi.keputusan !== KEPUTUSAN.SETUJUI) {
      return { boleh: false, alasan: 'Tahap Kaprodi belum disetujui. Verifikasi Admin belum dapat dilakukan.' };
    }
  }

  const statusTujuan = KEPUTUSAN_KE_STATUS[keputusan][tahap];
  const t = cekTransisi({ dari: proposal.status, ke: statusTujuan, roles });
  if (!t.boleh) return { boleh: false, alasan: t.alasan };

  return { boleh: true, tahap, statusTujuan };
}

/**
 * Catat keputusan verifikasi + geser status proposal dalam satu transaksi.
 */
export async function catatVerifikasi({ proposal, keputusan, catatan, userId }) {
  const v = await prisma.verifications.upsert({
    where: { proposalId_tahap: { proposalId: proposal.id, tahap: proposal.__tahap } },
    create: {
      proposalId: proposal.id,
      tahap: proposal.__tahap,
      verifikatorId: userId,
      keputusan,
      catatan: catatan?.trim() || null,
    },
    update: {
      verifikatorId: userId,
      keputusan,
      catatan: catatan?.trim() || null,
      // createdAt sengaja tidak diubah: jejak audit waktu keputusan asli hilang.
    },
    select: { id: true, tahap: true, keputusan: true, catatan: true, createdAt: true },
  });

  const baru = await prisma.proposals.update({
    where: { id: proposal.id },
    data: { status: proposal.__statusTujuan },
    select: { id: true, judul: true, status: true, updatedAt: true },
  });

  return { verifikasi: v, proposal: baru };
}
