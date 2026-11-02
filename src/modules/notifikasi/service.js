// src/modules/notifikasi/service.js
// Notifikasi in-app otomatis pada setiap transisi status proposal.
// Dibuat sebagai helper terpisah supaya setiap route cukup memanggil
// `beritahu()` dan tidak mengulang penulisan tabel notifications.
import { prisma } from '@/lib/prisma';

/**
 * Catat notifikasi untuk satu atau banyak penerima.
 * Kegagalan menulis notifikasi TIDAK boleh menggagalkan transaksi utama —
 * notifikasi adalah efek samping, bukan bagian dari keabsahan aksi.
 */
export async function beritahu(userIds, { judul, pesan, link = null }) {
  const daftar = [...new Set([].concat(userIds).filter(Boolean))];
  if (!daftar.length) return 0;
  try {
    const r = await prisma.notifications.createMany({
      data: daftar.map((userId) => ({ userId, judul, pesan, link })),
      skipDuplicates: true,
    });
    return r.count;
  } catch (e) {
    console.error('[notifikasi] gagal mencatat:', e?.message);
    return 0;
  }
}

/** ID semua pengguna dengan role tertentu. */
export async function penggunaRole(namaRole) {
  const rows = await prisma.userRoles.findMany({
    where: { role: namaRole },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

/** Ketua pengusul sebuah proposal. */
export async function ketuaProposal(proposalId) {
  const p = await prisma.proposals.findUnique({
    where: { id: proposalId },
    select: { dosenId: true },
  });
  return p?.dosenId ?? null;
}

/** ADMIN pada prodi yang sama dengan proposal (untuk verifikasi tahap Kaprodi). */
export async function kaprodiProdi(programStudiId) {
  const rows = await prisma.users.findMany({
    where: { programStudiId, roles: { some: { role: 'KAPRODI' } } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

// Pesan baku per transisi, supaya nada & isi notifikasi seragam.
export const PESAN = {
  submit: (judul) => ({
    judul: 'Proposal menunggu verifikasi',
    pesan: `Proposal "${judul}" telah dikirim dan menunggu verifikasi Kaprodi.`,
    link: '/proposal',
  }),
  verifikasiKaprodiSetuju: (judul) => ({
    judul: 'Menunggu verifikasi Admin',
    pesan: `Kaprodi menyetujui proposal "${judul}". Menunggu verifikasi Admin LPPM.`,
    link: '/verifikasi',
  }),
  verifikasiRevisi: (judul, tahap) => ({
    judul: `Revisi diminta (${tahap})`,
    pesan: `${tahap} meminta revisi pada proposal "${judul}". Silakan perbaiki dan kirim ulang.`,
    link: '/proposal',
  }),
  verifikasiTolak: (judul, tahap) => ({
    judul: `Proposal ditolak (${tahap})`,
    pesan: `${tahap} menolak proposal "${judul}".`,
    link: '/proposal',
  }),
  masukReview: (judul) => ({
    judul: 'Proposal masuk tahap review',
    pesan: `Proposal "${judul}" telah lolos verifikasi dan masuk tahap penilaian reviewer.`,
    link: '/proposal',
  }),
  ditugaskanReviewer: (judul, urutan) => ({
    judul: `Anda ditugaskan sebagai Reviewer ${urutan}`,
    pesan: `Anda ditugaskan menilai proposal "${judul}" sebagai Reviewer ${urutan} (blind review).`,
    link: '/review',
  }),
  hasilReview: (judul, status) => ({
    judul: `Hasil penilaian: ${status}`,
    pesan: `Penilaian reviewer untuk proposal "${judul}" selesai. Status kini ${status}.`,
    link: '/proposal',
  }),
  perluKeputusan: (judul) => ({
    judul: 'Perlu keputusan rapat',
    pesan: `Reviewer berselisih pada proposal "${judul}". Diperlukan keputusan rapat offline.`,
    link: '/verifikasi',
  }),
  keputusanRapat: (judul, keputusan) => ({
    judul: `Keputusan rapat: ${keputusan}`,
    pesan: `Rapat offline memutuskan proposal "${judul}" — ${keputusan}.`,
    link: '/proposal',
  }),
  dokumenTerbit: (judul, nomor) => ({
    judul: 'Dokumen SK/ST terbit',
    pesan: `Dokumen untuk proposal "${judul}" terbit dengan nomor ${nomor}.`,
    link: '/dokumen',
  }),
};
