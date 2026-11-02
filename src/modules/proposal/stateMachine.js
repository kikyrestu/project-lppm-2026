// src/modules/proposal/stateMachine.js
// Peta transisi status proposal — sumber kebenaran: use-case narrative.
// Pesanan verifikasi yang benar: KAPRODI lebih dulu, lalu ADMIN.
// Modul ini disengaja bebas-Prisma supaya bisa diuji murni tanpa database.

export const S = {
  DRAFT: 'DRAFT',
  MENUNGGU_KAPRODI: 'MENUNGGU_VERIFIKASI_KAPRODI',
  MENUNGGU_ADMIN: 'MENUNGGU_VERIFIKASI_ADMIN',
  PERLU_REVISI: 'PERLU_REVISI',
  MENUNGGU_REVIEW: 'MENUNGGU_REVIEW',
  PERLU_KEPUTUSAN: 'PERLU_KEPUTUSAN',
  MENUNGGU_SK_ST: 'MENUNGGU_SK_ST',
  LOLOS: 'LOLOS',
  DITOLAK: 'DITOLAK',
  SELESAI: 'SELESAI',
};

/**
 * daftar transisi sah: dari -> [ke, ...]
 * Setiap transisi memuat role yang boleh memicunya.
 */
const TRANSISI = {
  // Pengusul mengirim proposal. Bisa dari DRAFT maupun saat diminta revisi.
  [S.DRAFT]: {
    [S.MENUNGGU_KAPRODI]: ['DOSEN', 'KAPRODI', 'ADMIN'],
  },
  [S.PERLU_REVISI]: {
    [S.MENUNGGU_KAPRODI]: ['DOSEN', 'KAPRODI', 'ADMIN'],
  },
  // Tahap 1: Kaprodi prodi terkait.
  [S.MENUNGGU_KAPRODI]: {
    [S.MENUNGGU_ADMIN]: ['KAPRODI', 'ADMIN'],   // setuju -> lanjut tahap 2
    [S.PERLU_REVISI]: ['KAPRODI', 'ADMIN'],      // minta revisi
    [S.DITOLAK]: ['KAPRODI', 'ADMIN'],           // tolak
  },
  // Tahap 2: Admin LPPM.
  [S.MENUNGGU_ADMIN]: {
    [S.MENUNGGU_REVIEW]: ['ADMIN'],              // setuju -> dikirim ke reviewer
    [S.PERLU_REVISI]: ['ADMIN'],
    [S.DITOLAK]: ['ADMIN'],
  },
  // Setelah verifikasi 2 tahap: penugasan & penilaian reviewer (M3).
  // Hasil tie-breaker menentukan status akhir penilaian:
  //   TERIMA+TERIMA -> LOLOS · ada REVISI -> PERLU_REVISI · TERIMA+TOLAK -> PERLU_KEPUTUSAN
  [S.MENUNGGU_REVIEW]: {
    [S.PERLU_KEPUTUSAN]: ['ADMIN', 'REVIEWER'],
    [S.LOLOS]: ['ADMIN', 'REVIEWER'],
    [S.PERLU_REVISI]: ['ADMIN', 'REVIEWER'],
  },
  [S.PERLU_KEPUTUSAN]: {
    [S.MENUNGGU_SK_ST]: ['ADMIN'],               // lolos, menunggu penerbitan
    [S.LOLOS]: ['ADMIN'],
    [S.DITOLAK]: ['ADMIN'],
  },
  [S.MENUNGGU_SK_ST]: {
    [S.SELESAI]: ['ADMIN'],                      // SK/ST terbit
  },
};

// Status akhir: tidak boleh bergerak lagi.
const AKHIR = new Set([S.LOLOS, S.DITOLAK, S.SELESAI]);

/**
 * Periksa apakah transisi diizinkan.
 * @returns {{boleh: boolean, alasan?: string}}
 */
export function cekTransisi({ dari, ke, roles = [] }) {
  if (!dari) return { boleh: false, alasan: 'Status proposal tidak ditemukan.' };
  if (!ke) return { boleh: false, alasan: 'Status tujuan wajib diisi.' };
  if (dari === ke) {
    return { boleh: false, alasan: `Proposal sudah berstatus ${dari}.` };
  }
  if (AKHIR.has(dari)) {
    return { boleh: false, alasan: `Status ${dari} bersifat akhir dan tidak dapat diubah.` };
  }
  const pilihan = TRANSISI[dari];
  if (!pilihan) {
    return { boleh: false, alasan: `Tidak ada transisi keluar dari status ${dari}.` };
  }
  const roleDiizinkan = pilihan[ke];
  if (!roleDiizinkan) {
    return {
      boleh: false,
      alasan: `Transisi ${dari} -> ${ke} tidak sah. Pilihan yang diizinkan: ${Object.keys(pilihan).join(', ')}.`,
    };
  }
  if (!roles.some((r) => roleDiizinkan.includes(r))) {
    return { boleh: false, alasan: `Perubahan ini khusus role: ${roleDiizinkan.join(', ')}.` };
  }
  return { boleh: true };
}

// Status yang masih boleh diedit isinya oleh pengusul (di luar status akhir).
export const STATUS_DAPAT_DIEDIT = new Set([S.DRAFT, S.PERLU_REVISI]);

// Status yang sudah mengunci proposal: anggota & isi tidak boleh diubah.
export const STATUS_TERKUNCI = (s) => !STATUS_DAPAT_DIEDIT.has(s);

// Ringkasan untuk ditampilkan di peta status.
export function daftarTransisi() {
  const out = [];
  for (const [dari, pilihan] of Object.entries(TRANSISI)) {
    for (const [ke, role] of Object.entries(pilihan)) {
      out.push({ dari, ke, role });
    }
  }
  return out;
}
