// src/modules/master/service.js — lapis layanan (service layer).
// Pemisahan ini penting: route handler hanya menangani HTTP (parse + respons),
// sedangkan aturan bisnis & akses database ada di sini.
// Pola ini menjadi cetakan untuk M2 Proposal, M3 Review, dst.
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------
// Program Studi
// ---------------------------------------------------------------
export const prodiService = {
  list: () => prisma.programStudi.findMany({ orderBy: { kode: 'asc' } }),

  byId: (id) => prisma.programStudi.findUnique({ where: { id } }),

  create: (d) => prisma.programStudi.create({ data: d }),

  update: (id, d) => prisma.programStudi.update({ where: { id }, data: d }),

  // Cek dulu apakah masih dipakai user / proposal, supaya tidak memicu FK error.
  async remove(id) {
    const dipakai = await prisma.users.count({ where: { programStudiId: id } })
      + await prisma.proposals.count({ where: { programStudiId: id } });
    if (dipakai > 0) {
      return { ok: false, code: 'IN_USE', terpakai: dipakai };
    }
    await prisma.programStudi.delete({ where: { id } });
    return { ok: true };
  },
};

// ---------------------------------------------------------------
// Periode Akademik — aturan: tepat SATU periode aktif
// ---------------------------------------------------------------
export const periodeService = {
  list: () => prisma.periodeAkademik.findMany({
    orderBy: [{ isActive: 'desc' }, { tahunMulai: 'desc' }, { nama: 'asc' }],
  }),

  byId: (id) => prisma.periodeAkademik.findUnique({ where: { id } }),

  // Membuat periode sekaligus menonaktifkan periode lain bila ini diaktifkan.
  async create(d) {
    return prisma.$transaction(async (tx) => {
      if (d.isActive) {
        await tx.periodeAkademik.updateMany({ data: { isActive: false } });
      }
      return tx.periodeAkademik.create({ data: d });
    });
  },

  async update(id, d) {
    return prisma.$transaction(async (tx) => {
      if (d.isActive) {
        // Nonaktifkan semua periode LAIN terlebih dahulu — menjamin satu aktif.
        await tx.periodeAkademik.updateMany({
          where: { id: { not: id } },
          data: { isActive: false },
        });
      }
      return tx.periodeAkademik.update({ where: { id }, data: d });
    });
  },

  async remove(id) {
    const terpakai = await prisma.proposals.count({ where: { periodeAkademikId: id } });
    if (terpakai > 0) return { ok: false, code: 'IN_USE', terpakai };
    await prisma.periodeAkademik.delete({ where: { id } });
    return { ok: true };
  },

  aktif: () => prisma.periodeAkademik.findFirst({ where: { isActive: true } }),
};

// ---------------------------------------------------------------
// Konfigurasi Field Dinamis — dikonsumsi M2 Proposal
// ---------------------------------------------------------------
export const formFieldService = {
  // Diurutkan sesuai urutan tampil di form.
  list: (jenis) => prisma.formFieldConfig.findMany({
    where: jenis ? { jenisProposal: jenis } : undefined,
    orderBy: { urutan: 'asc' },
  }),

  byId: (id) => prisma.formFieldConfig.findUnique({ where: { id } }),

  create: (d) => prisma.formFieldConfig.create({ data: d }),

  update: (id, d) => prisma.formFieldConfig.update({ where: { id }, data: d }),

  remove: (id) => prisma.formFieldConfig.delete({ where: { id } }),

  // Kunci unik (jenisProposal, label) menjamin tidak ada field ganda.
  cekDuplikat: (jenisProposal, label, kecualiId = null) =>
    prisma.formFieldConfig.findFirst({
      where: { jenisProposal, label, NOT: kecualiId ? { id: kecualiId } : undefined },
    }),
};
