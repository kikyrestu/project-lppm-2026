// src/modules/review/tieBreaker.js
// Mesin penggabung hasil review 2 reviewer (blind) -> keputusan proposal.
// Sumber kebenaran: use-case narrative M3.
//
// Aturan:
//   TERIMA + TERIMA      -> hasilKombinasi TERIMA_TERIMA  -> status LOLOS
//   ada REVISI (salah satu / keduanya) -> ADA_REVISI      -> status PERLU_REVISI
//   TERIMA + TOLAK       -> hasilKombinasi TERIMA_TOLAK   -> status PERLU_KEPUTUSAN
//                                                                (perlu rapat offline)
//   TOLAK  + TOLAK       -> hasilKombinasi TERIMA_TOLAK   -> status DITOLAK
//
// Catatan enum: skema hanya menyediakan 3 nilai HasilKombinasi, jadi pasangan
// TOLAK+TOLAK ikut ke bucket TERIMA_TOLAK (keduanya sepakat menolak — bukan
// sengketa, sehingga tidak perlu rapat). Dibedakan lewat `perluRapat`.

import { S } from '@/modules/proposal/stateMachine';

export const REKOMENDASI = {
  TERIMA: 'TERIMA',
  REVISI: 'REVISI',
  TOLAK: 'TOLAK',
};

const HASIL = {
  TERIMA_TERIMA: 'TERIMA_TERIMA',
  ADA_REVISI: 'ADA_REVISI',
  TERIMA_TOLAK: 'TERIMA_TOLAK',
};

const REKOMENDASI_SAH = new Set(Object.values(REKOMENDASI));

/**
 * Gabungkan rekomendasi Reviewer 1 dan Reviewer 2.
 *
 * @param {{urutanReviewer:number, rekomendasi:string}[]} daftar
 *        tepat 2 entri, urutanReviewer 1 dan 2
 * @returns {{boleh:boolean, alasan?:string, hasilKombinasi?:string,
 *            keputusanAkhir?:string, perluRapat?:boolean, statusTujuan?:string}}
 */
export function evaluateCombinedReviews(daftar) {
  if (!Array.isArray(daftar) || daftar.length !== 2) {
    return { boleh: false, alasan: 'Evaluasi membutuhkan tepat 2 hasil review.' };
  }

  const urut = {};
  for (const r of daftar) {
    if (!REKOMENDASI_SAH.has(r.rekomendasi)) {
      return {
        boleh: false,
        alasan: `Rekomendasi tidak sah: "${r.rekomendasi}". Pilihan: ${[...REKOMENDASI_SAH].join(', ')}.`,
      };
    }
    if (r.urutanReviewer !== 1 && r.urutanReviewer !== 2) {
      return { boleh: false, alasan: `urutanReviewer harus 1 atau 2, bukan ${r.urutanReviewer}.` };
    }
    if (urut[r.urutanReviewer]) {
      return { boleh: false, alasan: `Reviewer ${r.urutanReviewer} sudah memiliki hasil.` };
    }
    urut[r.urutanReviewer] = r.rekomendasi;
  }

  if (!urut[1] || !urut[2]) {
    return { boleh: false, alasan: 'Kedua reviewer (1 dan 2) wajib sudah menilai.' };
  }

  const r1 = urut[1];
  const r2 = urut[2];

  // REVISI didahulukan: permintaan revisi dari salah satu sudah cukup
  // menggagalkan kelulusan otomatis tanpa perlu rapat.
  if (r1 === REKOMENDASI.REVISI || r2 === REKOMENDASI.REVISI) {
    return {
      boleh: true,
      hasilKombinasi: HASIL.ADA_REVISI,
      keputusanAkhir: S.PERLU_REVISI,
      perluRapat: false,
      statusTujuan: S.PERLU_REVISI,
      alasan: 'Ada reviewer yang meminta revisi — proposal dikembalikan ke pengusul.',
    };
  }

  if (r1 === REKOMENDASI.TERIMA && r2 === REKOMENDASI.TERIMA) {
    return {
      boleh: true,
      hasilKombinasi: HASIL.TERIMA_TERIMA,
      keputusanAkhir: S.LOLOS,
      perluRapat: false,
      statusTujuan: S.LOLOS,
      alasan: 'Kedua reviewer menerima — proposal lolos.',
    };
  }

  if (r1 === REKOMENDASI.TOLAK && r2 === REKOMENDASI.TOLAK) {
    return {
      boleh: true,
      hasilKombinasi: HASIL.TERIMA_TOLAK,
      keputusanAkhir: S.DITOLAK,
      perluRapat: false,
      statusTujuan: S.DITOLAK,
      alasan: 'Kedua reviewer menolak — proposal ditolak.',
    };
  }

  // Sisanya pasti TERIMA + TOLAK: sengketa, perlu keputusan rapat offline.
  return {
    boleh: true,
    hasilKombinasi: HASIL.TERIMA_TOLAK,
    keputusanAkhir: null,
    perluRapat: true,
    statusTujuan: S.PERLU_KEPUTUSAN,
    alasan: 'Reviewer berselisih (TERIMA vs TOLAK) — menunggu keputusan rapat offline.',
  };
}

/**
 * Susun keterangan penilaian untuk ditampilkan ke reviewer.
 * ATURAN BLIND: reviewer hanya boleh melihat nilainya sendiri
 * — nilai reviewer lain tidak pernah ikut disertakan.
 */
export function ringkasanBlind(reviews, reviewerId) {
  const milikSaya = reviews.filter((r) => r.reviewerId === reviewerId);
  return {
    nilaiSaya: milikSaya.map((r) => ({
      urutanReviewer: r.urutanReviewer,
      skor: r.skor,
      rekomendasi: r.rekomendasi,
      catatan: r.catatan,
    })),
    // Hanya penanda progres — tanpa nilai, tanpa identitas reviewer lain.
    progresPenilaian: reviews.map((r) => ({
      urutanReviewer: r.urutanReviewer,
      sudahMenilai: r.rekomendasi !== null,
    })),
  };
}
