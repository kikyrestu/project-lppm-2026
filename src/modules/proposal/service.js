// src/modules/proposal/service.js — lapis layanan modul M2.
// Terpisah dari route handler: aturan bisnis di sini, penanganan HTTP di rute.
import { prisma } from '@/lib/prisma';
import { S, STATUS_DAPAT_DIEDIT } from './stateMachine';

export const BATAS_ANGGOTA = 3; // maksimum anggota, di luar ketua pengusul

// ------------------------------------------------------------------
// Validasi field dinamis terhadap konfigurasi M8
// ------------------------------------------------------------------
// Nilai dari klien TIDAK diterima apa adanya: hanya field yang terdaftar
// di form_field_configs yang boleh masuk. Ini mencegah klien menyuntikkan
// kolom sembarang ke dalam Json.
const TIPE_DIDUKUNG = new Set(['text', 'number', 'date', 'select', 'textarea', 'file']);

/**
 * @returns {{boleh: boolean, alasan?: string, field?: string, detail?: Array}}
 */
export async function validasiFieldDinamis({ jenis, fieldTambahan }) {
  const konfig = await prisma.formFieldConfig.findMany({
    where: { jenisProposal: jenis },
    orderBy: { urutan: 'asc' },
  });

  const isi = fieldTambahan ?? {};
  if (typeof isi !== 'object' || Array.isArray(isi)) {
    return { boleh: false, alasan: 'fieldTambahan harus berupa objek.' };
  }

  const terdaftar = new Map(konfig.map((k) => [k.label, k]));
  const detail = [];

  // 1) Setiap field WAJIB yang dikonfigurasi admin harus terisi.
  for (const k of konfig) {
    if (!k.wajib) continue;
    const v = isi[k.label];
    const kosong = v === undefined || v === null || v === '';
    if (kosong) {
      detail.push({ field: k.label, message: 'wajib diisi' });
    }
  }
  if (detail.length) {
    return { boleh: false, alasan: 'Ada field wajib yang belum diisi.', field: 'fieldTambahan', detail };
  }

  // 2) Tidak boleh ada field yang tidak terdaftar.
  for (const kunci of Object.keys(isi)) {
    if (!terdaftar.has(kunci)) {
      return {
        boleh: false,
        alasan: `Field "${kunci}" tidak terdaftar untuk ${jenis}.`,
        field: 'fieldTambahan',
      };
    }
  }

  // 3) Cek tipe setiap nilai.
  for (const [kunci, nilai] of Object.entries(isi)) {
    const k = terdaftar.get(kunci);
    if (!k || !TIPE_DIDUKUNG.has(k.tipeInput)) continue;

    if (k.tipeInput === 'select') {
      // Bentuk opsi di database: {"pilihan":["A","B"]} — bukan array polos.
      // Normalisasi supaya array polos lama pun tetap diterima.
      const opsi = Array.isArray(k.opsi) ? k.opsi
        : Array.isArray(k.opsi?.pilihan) ? k.opsi.pilihan
        : [];
      if (!opsi.includes(nilai)) {
        detail.push({
          field: kunci,
          message: opsi.length
            ? `harus salah satu dari: ${opsi.join(', ')}`
            : 'tidak ada opsi yang dikonfigurasi untuk field ini',
        });
      }
      continue;
    }
    if (k.tipeInput === 'number') {
      if (typeof nilai !== 'number' || !Number.isFinite(nilai)) {
        detail.push({ field: kunci, message: 'harus berupa angka' });
      }
      continue;
    }
    if (k.tipeInput === 'date') {
      if (typeof nilai !== 'string' || Number.isNaN(Date.parse(nilai))) {
        detail.push({ field: kunci, message: 'harus berupa tanggal yang valid (YYYY-MM-DD)' });
      }
      continue;
    }
    // text | textarea | file
    if (typeof nilai !== 'string') {
      detail.push({ field: kunci, message: 'harus berupa teks' });
    }
  }
  if (detail.length) {
    return { boleh: false, alasan: 'Isi field tidak sesuai tipe yang dikonfigurasi.', field: 'fieldTambahan', detail };
  }

  return { boleh: true };
}

// ------------------------------------------------------------------
// Proposal
// ------------------------------------------------------------------
const SERTA_ANGGOTA = { anggota: { include: { user: { select: { id: true, nidn: true, nama: true } } } } };

export const proposalService = {
  byId: (id) => prisma.proposals.findUnique({
    where: { id },
    include: {
      ...SERTA_ANGGOTA,
      dosen: { select: { id: true, nidn: true, nama: true, programStudiId: true } },
      programStudi: { select: { id: true, kode: true, nama: true } },
      periode: { select: { id: true, nama: true, isActive: true } },
    },
  }),

  async create({ dosenId, programStudiId, periodeId, jenis, judul, abstrak, anggaran, fieldTambahan }) {
    return prisma.proposals.create({
      data: {
        dosenId, programStudiId, periodeId, jenis, judul,
        abstrak: abstrak ?? null,
        anggaran: anggaran ?? null,
        // Simpan hanya field yang terdaftar — hasil validasi sudah dilakukan pemanggil.
        fieldTambahan: fieldTambahan ?? undefined,
        status: S.DRAFT,
      },
      include: SERTA_ANGGOTA,
    });
  },

  update: (id, data) => prisma.proposals.update({ where: { id }, data, include: SERTA_ANGGOTA }),

  /**
   * Daftar proposal sesuai peran pemohon.
   * DOSEN hanya melihat miliknya (sebagai ketua ATAU anggota).
   * ADMIN/KETUA melihat semua. KAPRODI hanya milik studinya.
   */
  async list({ userId, roles, programStudiId }) {
    const semua = roles.includes('ADMIN') || roles.includes('KETUA_STIKOM') || roles.includes('KETUA_LPPM');

    const where = {};
    if (!semua) {
      const syarat = [{ dosenId: userId }];
      if (roles.includes('KAPRODI') || roles.includes('PRODI')) {
        syarat.push({ programStudiId });
      }
      if (roles.includes('DOSEN')) {
        syarat.push({ anggota: { some: { userId } } });
      }
      where.OR = syarat;
    } else if (roles.includes('KAPRODI') || roles.includes('PRODI')) {
      // Kaprodi tanpa hak admin: batasi ke studinya sendiri.
      where.programStudiId = programStudiId;
    }

    return prisma.proposals.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        dosen: { select: { nidn: true, nama: true } },
        programStudi: { select: { kode: true, nama: true } },
        _count: { select: { anggota: true } },
      },
    });
  },
};

// ------------------------------------------------------------------
// Anggota tim
// ------------------------------------------------------------------
export const anggotaService = {
  daftar: (proposalId) => prisma.proposalMembers.findMany({
    where: { proposalId },
    include: { user: { select: { id: true, nidn: true, nama: true } } },
  }),

  hitung: (proposalId) => prisma.proposalMembers.count({ where: { proposalId } }),

  /**
   * Tambah anggota. Aturan:
   *  - NIDN harus menunjuk user aktif yang berperan DOSEN.
   *  - Tidak boleh menambahkan ketua pengusul sebagai anggota.
   *  - Tidak boleh duplikat (kunci unik (proposalId, userId)).
   *  - Maksimal BATAS_ANGGOTA orang.
   */
  async tambah({ proposalId, proposal, nidn }) {
    if (STATUS_DAPAT_DIEDIT.has(proposal.status) === false) {
      return { boleh: false, code: 'PROPOSAL_TERKUNCI',
        alasan: `Proposal berstatus ${proposal.status} tidak lagi bisa diubah anggotanya.` };
    }

    const calon = await prisma.users.findUnique({
      where: { nidn },
      select: { id: true, nidn: true, nama: true, status: true, roles: { select: { role: true } } },
    });
    if (!calon) {
      return { boleh: false, code: 'NOT_FOUND', alasan: `NIDN "${nidn}" tidak ditemukan.` };
    }
    if (calon.status !== 'AKTIF') {
      return { boleh: false, code: 'ACCOUNT_DISABLED',
        alasan: `Akun ${calon.nama} berstatus ${calon.status} dan tidak bisa ditambahkan.` };
    }
    const berperanDosen = calon.roles.some((r) => r.role === 'DOSEN');
    if (!berperanDosen) {
      return { boleh: false, code: 'VALIDATION',
        alasan: `${calon.nama} (${calon.nidn}) bukan berperan DOSEN.` };
    }
    if (calon.id === proposal.dosenId) {
      return { boleh: false, code: 'VALIDATION',
        alasan: 'Ketua pengusul tidak boleh tercatat sebagai anggota tim sendiri.' };
    }

    const ada = await prisma.proposalMembers.findUnique({
      where: { proposalId_userId: { proposalId, userId: calon.id } },
    });
    if (ada) {
      return { boleh: false, code: 'CONFLICT', alasan: `${calon.nama} sudah menjadi anggota.` };
    }

    const jumlah = await anggotaService.hitung(proposalId);
    if (jumlah >= BATAS_ANGGOTA) {
      return { boleh: false, code: 'LIMIT',
        alasan: `Anggota sudah mencapai batas maksimum ${BATAS_ANGGOTA} orang.` };
    }

    const row = await prisma.proposalMembers.create({ data: { proposalId, userId: calon.id } });
    return { boleh: true, row, anggota: calon, sisaKuota: BATAS_ANGGOTA - jumlah - 1 };
  },

  async hapus({ proposalId, userId, proposal }) {
    if (STATUS_DAPAT_DIEDIT.has(proposal.status) === false) {
      return { boleh: false, code: 'PROPOSAL_TERKUNCI',
        alasan: `Proposal berstatus ${proposal.status} tidak lagi bisa diubah anggotanya.` };
    }
    const ada = await prisma.proposalMembers.findUnique({
      where: { proposalId_userId: { proposalId, userId } },
    });
    if (!ada) {
      return { boleh: false, code: 'NOT_FOUND', alasan: 'Anggota tidak ditemukan pada proposal ini.' };
    }
    await prisma.proposalMembers.delete({ where: { id: ada.id } });
    return { boleh: true };
  },
};

export { S };
