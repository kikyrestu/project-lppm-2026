// src/modules/audit/service.js
// Jejak audit (M9) — setiap aksi penting pada proposal tercatat permanen.
// Log bersifat append-only: tidak ada endpoint yang mengubah atau menghapusnya.
import { prisma } from '@/lib/prisma';

// Kode aksi baku agar bisa disaring konsisten di endpoint audit.
export const AKSI = {
  SUBMIT: 'submit',
  VERIFIKASI: 'verifikasi',
  PENUGASAN_REVIEWER: 'tugaskan_reviewer',
  PENILAIAN: 'review',
  HASIL_KOMBINASI: 'hasil_kombinasi',
  KEPUTUSAN_RAPAT: 'keputusan_rapat',
  SUMBER_DANA: 'isi_sumber_dana',
  TERBIT_SK: 'generate_sk',
  TERBIT_ST: 'generate_st',
  BUAT_PROPOSAL: 'buat_proposal',
};

/**
 * Catat satu baris jejak audit.
 * Sama seperti notifikasi: kegagalan menulis log tidak boleh menggagalkan
 * aksi utama, karena log adalah efek samping — bukan syarat keabsahan.
 */
export async function catat({ proposalId = null, userId, aksi, keterangan = null }) {
  if (!userId || !aksi) return null;
  try {
    return await prisma.activityLogs.create({
      data: { proposalId, userId, aksi, keterangan },
      select: { id: true, aksi: true, createdAt: true },
    });
  } catch (e) {
    console.error('[audit] gagal mencatat:', e?.message);
    return null;
  }
}

/**
 * Susun isi ringkas satu baris log untuk ditampilkan di timeline.
 * Nilai lama/selalu disertakan sehingga pembaca melihat perubahan apa.
 */
export function ringkasLog(row) {
  const u = row.user;
  const p = row.proposal;
  return {
    id: row.id,
    waktu: row.createdAt,
    aksi: row.aksi,
    keterangan: row.keterangan,
    oleh: u ? { nidn: u.nidn, nama: u.nama } : null,
    proposal: p ? { id: p.id, judul: p.judul, status: p.status } : null,
  };
}
