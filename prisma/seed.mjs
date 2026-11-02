// prisma/seed.mjs — Data awal SI-LPPM
// 2 Prodi (TI/MI) · Periode aktif · 11 akun demo (7 role + multi-role) · field form dinamis
// Jalankan: npm run db:seed
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const HASH = bcrypt.hashSync('LppmDemo123!', 10); // password demo — ganti sebelum deploy riil

async function main() {
  console.log('Seeding SI-LPPM...');

  // ---- M8: Master ----
  const ti = await prisma.programStudi.upsert({
    where: { kode: 'TI' }, update: {},
    create: { kode: 'TI', nama: 'Teknik Informatika' },
  });
  const mi = await prisma.programStudi.upsert({
    where: { kode: 'MI' }, update: {},
    create: { kode: 'MI', nama: 'Sistem Informasi' },
  });

  const periode = await prisma.periodeAkademik.upsert({
    where: { id: 'periode-2026-ganjil' }, update: {},
    create: {
      id: 'periode-2026-ganjil', nama: '2026/2027 Ganjil',
      tahunMulai: 2026, tahunSelesai: 2027, isActive: true,
    },
  });

  // Field dinamis form proposal (M8 -> dikonsumsi M2)
  const dynFields = [
    { jenisProposal: 'PENELITIAN', label: 'Bidang Riset', tipeInput: 'select', opsi: { pilihan: ['Informatika', 'Sistem Informasi', 'Data Science'] }, wajib: true, urutan: 1 },
    { jenisProposal: 'PENELITIAN', label: 'Target Luaran', tipeInput: 'text', opsi: null, wajib: false, urutan: 2 },
    { jenisProposal: 'PENGABDIAN', label: 'Lokasi Pengabdian', tipeInput: 'text', opsi: null, wajib: true, urutan: 1 },
    { jenisProposal: 'KKN', label: 'Desa Sasaran', tipeInput: 'text', opsi: null, wajib: true, urutan: 1 },
  ];
  for (const f of dynFields) {
    // upsert di kunci unik (jenisProposal, label) — aman dijalankan berulang
    await prisma.formFieldConfig.upsert({
      where: {
        jenisProposal_label: { jenisProposal: f.jenisProposal, label: f.label },
      },
      update: { tipeInput: f.tipeInput, opsi: f.opsi, wajib: f.wajib, urutan: f.urutan },
      create: f,
    });
  }

  // ---- M1: Akun demo (7 role) ----
  const akun = [
    { nidn: '9999999001', nama: 'Admin LPPM',    roles: ['ADMIN'],                ps: ti },
    { nidn: '9999999002', nama: 'Ketua STIKOM',  roles: ['KETUA_STIKOM'],         ps: ti },
    { nidn: '9999999003', nama: 'Ketua LPPM',    roles: ['KETUA_LPPM'],           ps: ti },
    { nidn: '9999999004', nama: 'Prodi TI',      roles: ['PRODI'],                ps: ti },
    { nidn: '0412345678', nama: 'Kaprodi TI',    roles: ['KAPRODI'],              ps: ti },
    { nidn: '0412345679', nama: 'Kaprodi MI',    roles: ['KAPRODI'],              ps: mi },
    { nidn: '0412345680', nama: 'Dr. Dosen Satu', roles: ['DOSEN'],               ps: ti },
    { nidn: '0412345681', nama: 'Dr. Dosen Dua',  roles: ['DOSEN'],               ps: mi },
    { nidn: '0412345682', nama: 'Reviewer Utama', roles: ['REVIEWER'],            ps: ti },
    { nidn: '0412345683', nama: 'Reviewer Dua',   roles: ['REVIEWER'],            ps: mi },
    // multi-role: dosen yg juga kaprodi (uji dashboard selector)
    { nidn: '0412345684', nama: 'Prof. Multi Role', roles: ['DOSEN', 'KAPRODI'],  ps: ti },
  ];

  for (const a of akun) {
    const user = await prisma.users.upsert({
      where: { nidn: a.nidn }, update: {},
      create: {
        nidn: a.nidn, nama: a.nama, passwordHash: HASH,
        programStudiId: a.ps.id, status: 'AKTIF',
      },
    });
    for (const role of a.roles) {
      await prisma.userRoles.upsert({
        where: { userId_role: { userId: user.id, role } }, update: {},
        create: { userId: user.id, role },
      });
    }
  }

  const nUser = await prisma.users.count();
  const nRole = await prisma.userRoles.count();
  const nProdi = await prisma.programStudi.count();
  const nPeriode = await prisma.periodeAkademik.count();
  const nField = await prisma.formFieldConfig.count();

  console.log(`✔ Prodi: ${nProdi} | Periode: ${nPeriode} | Field dinamis: ${nField}`);
  console.log(`✔ Users: ${nUser} | Roles: ${nRole}`);
  console.log('✔ Login demo — password: LppmDemo123!  (NIDN: 9999999001=Admin, 0412345680=Dosen, 0412345684=Multi)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
