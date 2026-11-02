// src/modules/rekap/service.js
// Agregasi statistik LPPM (M5). Semua dihitung ulang dari tabel proposal
// yang sudah ada — tidak ada tabel agregat yang disimpan, sehingga angka
// tidak pernah bisa usang terhadap data rujukannya.
import { prisma } from '@/lib/prisma';

// Tahap agregasi dipetakan ke bucket laporan, bukan memakai status mentah,
// supaya tampilan ringkas tidak terpecah jadi belasan baris.
const BUCKET = {
  DRAFT: 'Pra-Kirim',
  MENUNGGU_VERIFIKASI_KAPRODI: 'Menunggu Verifikasi',
  MENUNGGU_VERIFIKASI_ADMIN: 'Menunggu Verifikasi',
  MENUNGGU_REVIEW: 'Penilaian Reviewer',
  PERLU_KEPUTUSAN: 'Penilaian Reviewer',
  PERLU_REVISI: 'Perlu Revisi',
  LOLOS: 'Lolos',
  MENUNGGU_SK_ST: 'Lolos',
  DITOLAK: 'Ditolak',
};

/** Kunci penyusun laporan per periode akademik. */
export const KUNCI = {
  PROPOSAL_PER_STATUS: 'proposal_per_status',
  PROPOSAL_PER_JENIS: 'proposal_per_jenis',
  PROPOSAL_PER_PRODI: 'proposal_per_prodi',
  PROPOSAL_PER_TAHUN: 'proposal_per_tahun',
  REVIEWER_TERPAKAI: 'reviewer_terpakai',
};

/**
 * Rekap utama untuk satu rentang periode akademik.
 * `programStudiId` bersifat opsional — bila diisi, seluruh angka dibatasi
 * ke prodi tersebut (dipakai endpoint Kaprodi).
 */
export async function rekap({ periodeId = null, tahunAkademik = null, programStudiId = null } = {}) {
  const wherePeriode = {};
  if (periodeId) wherePeriode.id = periodeId;
  // Kolom asli hanya tahunMulai/tahunSelesai — "tahunAkademik" tidak ada.
  else if (tahunAkademik) wherePeriode.tahunMulai = Number(tahunAkademik);
  // Tanpa parameter, pakai periode aktif — bukan baris sembarang.
  else wherePeriode.isActive = true;

  const periode = await prisma.periodeAkademik.findFirst({
    where: wherePeriode,
    select: { id: true, nama: true, tahunMulai: true, tahunSelesai: true, isActive: true },
  });
  if (!periode) return null;

  const batas = { periodeId: periode.id, ...(programStudiId ? { programStudiId } : {}) };

  const [total, perJenis, perStatus, perProdi, perTahun, terpakai] = await Promise.all([
    prisma.proposals.count({ where: batas }),
    prisma.proposals.groupBy({ by: ['jenis'], where: batas, _count: { _all: true } }),
    prisma.proposals.groupBy({ by: ['status'], where: batas, _count: { _all: true } }),
    prisma.proposals.groupBy({
      by: ['programStudiId'], where: { periodeId: periode.id },
      _count: { _all: true },
    }),
    prisma.proposals.groupBy({
      by: ['periodeId'], where: batas, _count: { _all: true },
    }),
    prisma.reviews.count({
      where: { proposal: { periodeId: periode.id } },
    }),
  ]);

  // Susun bucket agar urutannya stabil di setiap panggilan.
  const urutanBucket = ['Pra-Kirim', 'Menunggu Verifikasi', 'Penilaian Reviewer',
                        'Perlu Revisi', 'Lolos', 'Ditolak'];
  const saku = Object.fromEntries(urutanBucket.map((b) => [b, 0]));
  for (const s of perStatus) {
    const b = BUCKET[s.status];
    if (b) saku[b] += s._count._all;
  }

  const namaProdi = await prisma.programStudi.findMany({
    select: { id: true, nama: true },
  });
  const petaNama = Object.fromEntries(namaProdi.map((p) => [p.id, p.nama]));

  return {
    periode,
    totalProposal: total,
    perStatus: urutanBucket.map((b) => ({ tahap: b, jumlah: saku[b] })),
    perJenis: perJenis
      .map((r) => ({ jenis: r.jenis, jumlah: r._count._all }))
      .sort((a, b) => b.jumlah - a.jumlah),
    perProdi: perProdi
      .map((r) => ({ programStudi: petaNama[r.programStudiId] ?? r.programStudiId,
                     jumlah: r._count._all }))
      .sort((a, b) => b.jumlah - a.jumlah),
    perPeriode: perTahun.map((r) => ({ periodeId: r.periodeId, jumlah: r._count._all })),
    jumlahPenilaianReviewer: terpakai,
  };
}

/** Daftar periode akademik untuk dropdown filter rekap. */
export async function daftarPeriode() {
  return prisma.periodeAkademik.findMany({
    orderBy: [{ tahunMulai: 'desc' }, { nama: 'asc' }],
    select: { id: true, nama: true, tahunMulai: true, tahunSelesai: true, isActive: true },
  });
}
