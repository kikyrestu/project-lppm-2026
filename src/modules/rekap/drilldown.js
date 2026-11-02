// src/modules/rekap/drilldown.js
// Drill-down (M5): dari angka rekap menjadi rincian siapa yang ada di baliknya.
// Setiap jawaban menyertakan `jumlah` terhitung ulang dari baris yang benar-benar
// dikembalikan, supaya angka di layar selalu sama dengan daftar yang tampil.
import { prisma } from '@/lib/prisma';

export const JENIS_DRILL = {
  status: 'proposal',
  jenis: 'proposal',
  prodi: 'proposal',
  dosen: 'dosen',
  reviewer: 'reviewer',
};

/**
 * @param {string} dimensi  status|jenis|prodi|dosen|reviewer
 * @param {string} nilai    nilai yang diklik pada rekap
 */
export async function rincian({ periodeId, dimensi, nilai, programStudiId = null }) {
  const batas = { ...(periodeId ? { periodeId } : {}),
                  ...(programStudiId ? { programStudiId } : {}) };

  if (dimensi === 'status') {
    // Nilai dikembalikan sebagai bucket, jadi balikkan ke status mentahnya.
    const SEMUA = ['DRAFT', 'MENUNGGU_VERIFIKASI_KAPRODI', 'MENUNGGU_VERIFIKASI_ADMIN',
                   'MENUNGGU_REVIEW', 'PERLU_KEPUTUSAN', 'PERLU_REVISI',
                   'LOLOS', 'MENUNGGU_SK_ST', 'DITOLAK'];
    const map = {
      'Pra-Kirim': ['DRAFT'],
      'Menunggu Verifikasi': ['MENUNGGU_VERIFIKASI_KAPRODI', 'MENUNGGU_VERIFIKASI_ADMIN'],
      'Penilaian Reviewer': ['MENUNGGU_REVIEW', 'PERLU_KEPUTUSAN'],
      'Perlu Revisi': ['PERLU_REVISI'],
      'Lolos': ['LOLOS', 'MENUNGGU_SK_ST'],
      'Ditolak': ['DITOLAK'],
    };
    const daftar = map[nilai] ?? (SEMUA.includes(nilai) ? [nilai] : []);
    if (!daftar.length) return { dimensi, nilai, jumlah: 0, rincian: [] };

    const baris = await prisma.proposals.findMany({
      where: { ...batas, status: { in: daftar } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, judul: true, jenis: true, status: true, updatedAt: true,
        dosen: { select: { nidn: true, nama: true } },
        programStudi: { select: { nama: true } },
      },
    });
    return { dimensi, nilai, jumlah: baris.length,
             rincian: baris.map(tampilProposal) };
  }

  if (dimensi === 'jenis') {
    const baris = await prisma.proposals.findMany({
      where: { ...batas, jenis: nilai },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, judul: true, jenis: true, status: true, updatedAt: true,
        dosen: { select: { nidn: true, nama: true } },
        programStudi: { select: { nama: true } },
      },
    });
    return { dimensi, nilai, jumlah: baris.length,
             rincian: baris.map(tampilProposal) };
  }

  if (dimensi === 'prodi') {
    const baris = await prisma.proposals.findMany({
      where: { periodeId: periodeId ?? undefined,
               programStudi: { nama: nilai } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, judul: true, jenis: true, status: true, updatedAt: true,
        dosen: { select: { nidn: true, nama: true } },
        programStudi: { select: { nama: true } },
      },
    });
    return { dimensi, nilai, jumlah: baris.length,
             rincian: baris.map(tampilProposal) };
  }

  if (dimensi === 'dosen') {
    // Dosen yang disebut bisa berupa pengusul, ketua, maupun anggota tim.
    const baris = await prisma.proposals.findMany({
      where: {
        ...batas,
        OR: [
          { dosen: { nidn: nilai } },
          { members: { some: { user: { nidn: nilai } } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, judul: true, jenis: true, status: true, updatedAt: true,
        dosen: { select: { nidn: true, nama: true } },
        programStudi: { select: { nama: true } },
        members: { select: { urutan: true, user: { select: { nidn: true, nama: true } } } },
      },
    });
    return { dimensi, nilai, jumlah: baris.length,
             rincian: baris.map((r) => ({
               ...tampilProposal(r),
               anggota: r.members
                 .sort((a, b) => a.urutan - b.urutan)
                 .map((m) => `${m.user.nidn} ${m.user.nama}`),
             })) };
  }

  if (dimensi === 'reviewer') {
    const baris = await prisma.reviews.findMany({
      where: {
        reviewer: { nidn: nilai },
        ...(periodeId ? { proposal: { periodeId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        urutanReviewer: true, skor: true, rekomendasi: true, createdAt: true,
        proposal: {
          select: { id: true, judul: true, status: true,
                    dosen: { select: { nama: true } } },
        },
      },
    });
    return {
      dimensi, nilai, jumlah: baris.length,
      rincian: baris.map((r) => ({
        proposalId: r.proposal.id,
        judul: r.proposal.judul,
        pengusul: r.proposal.dosen.nama,
        status: r.proposal.status,
        urutan: r.urutanReviewer,
        skor: r.skor,
        rekomendasi: r.rekomendasi,
        waktu: r.createdAt,
      })),
    };
  }

  return { dimensi, nilai, jumlah: 0, rincian: [],
           pesan: `Dimensi "${dimensi}" tidak dikenali.` };
}

function tampilProposal(r) {
  return {
    id: r.id, judul: r.judul, jenis: r.jenis, status: r.status,
    pengusul: r.dosen ? `${r.dosen.nidn} ${r.dosen.nama}` : null,
    programStudi: r.programStudi?.nama ?? null,
    terakhirDiubah: r.updatedAt,
  };
}
