// src/modules/dokumen/service.js
// Penerbitan SK & ST: sumber dana, penomoran otomatis, dan pembuatan record.
import { prisma } from '@/lib/prisma';

export const SUMBER_DANA = ['INTERNAL', 'EKSTERNAL', 'MANDIRI'];

// Status yang boleh menerbitkan dokumen: sudah lolos penilaian reviewer.
export const STATUS_BOLEH_TERMINBIT = ['LOLOS', 'MENUNGGU_SK_ST'];

/**
 * Penomoran otomatis tahunan.
 *   SK/LPPM/0001/2026
 *   ST/LPPM/0001/2026
 * Nomor dihitung dari record yang sudah ada pada tahun berjalan, lalu
 * dijamin unik oleh unique index di database (lihat migrasi
 * 20261029_unique_nomor_sk_st) — sehingga percobaan serentak tidak
 * pernah menghasilkan nomor ganda, hanya salah satu yang berhasil.
 */
function susunNomor(prefix, urutan, tahun) {
  return `${prefix}/LPPM/${String(urutan).padStart(4, '0')}/${tahun}`;
}

async function nomorBerikutnya(prefix, tahun, tx = prisma) {
  // Hitung nomor tertinggi yang sudah terpakai pada tahun berjalan.
  const pola = `${prefix}/LPPM/%/${tahun}`;
  const row = await tx.$queryRaw`
    SELECT nomor FROM (
      SELECT nomor_sk AS nomor FROM documents WHERE nomor_sk LIKE ${pola}
      UNION ALL
      SELECT nomor_st AS nomor FROM documents WHERE nomor_st LIKE ${pola}
    ) t WHERE nomor IS NOT NULL
    ORDER BY CAST(SUBSTRING_INDEX(nomor, '/', -2) AS UNSIGNED) DESC
    LIMIT 1`;
  const terakhir = row?.[0]?.nomor;
  const urut = terakhir
    ? parseInt(String(terakhir).split('/')[2], 10) + 1
    : 1;
  return { urutan: urut, nomor: susunNomor(prefix, urut, tahun) };
}

/**
 * Terbitkan SK (dan ST bila diminta) untuk satu proposal.
 * Semua pemeriksaan berjalan di dalam transaksi agar tidak ada celah
 * antara "dicek" dan "ditulis".
 */
export async function terbitkanDokumen({ proposal, jenis, userId, tahun }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.documents.findUnique({
      where: { proposalId: proposal.id },
    });

    if (jenis === 'SK' && existing?.nomorSk) {
      return { gagal: 409, code: 'SK_SUDAH_TERBIT',
               pesan: `SK sudah terbit dengan nomor ${existing.nomorSk}.` };
    }
    if (jenis === 'ST' && existing?.nomorSt) {
      return { gagal: 409, code: 'ST_SUDAH_TERBIT',
               pesan: `ST sudah terbit dengan nomor ${existing.nomorSt}.` };
    }
    // ST mensyaratkan SK lebih dulu — surat tugas tidak mendahului keputusan.
    if (jenis === 'ST' && !existing?.nomorSk) {
      return { gagal: 409, code: 'SK_BELUM_TERBIT',
               pesan: 'Surat Tugas hanya dapat diterbitkan setelah SK terbit.' };
    }

    const nSk = jenis === 'SK' ? await nomorBerikutnya('SK', tahun, tx) : null;
    const nSt = jenis === 'ST' ? await nomorBerikutnya('ST', tahun, tx) : null;

    const data = {
      dibuatOleh: userId,
      tanggalTerbit: new Date(),
      ...(nSk ? { nomorSk: nSk.nomor } : {}),
      ...(nSt ? { nomorSt: nSt.nomor } : {}),
    };

    const dok = await tx.documents.upsert({
      where: { proposalId: proposal.id },
      create: { proposalId: proposal.id, ...data },
      update: data,
      select: {
        id: true, nomorSk: true, nomorSt: true, tanggalTerbit: true,
        pembuat: { select: { nidn: true, nama: true } },
      },
    });

    return {
      dokumen: dok,
      ...(nSk ? { nomorSk: nSk.nomor } : {}),
      ...(nSt ? { nomorSt: nSt.nomor } : {}),
    };
  });
}
