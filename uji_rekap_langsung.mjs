// uji_rekap_langsung.mjs — panggil service rekap tanpa lewat HTTP
import { createRequire } from 'module';
const req = createRequire(import.meta.url);

// Prisma client dibangun dari skema; pakai jalur biasa.
process.env.NODE_ENV = 'development';

const { PrismaClient } = req('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const n = await prisma.periodeAkademik.count();
    console.log('  periodeAkademik.count() =', n);
  } catch (e) {
    console.log('  GAGAL periodeAkademik:', e.message.split('\n').slice(0, 3).join(' | '));
  }
  try {
    const daftar = await prisma.periodeAkademik.findMany({
      orderBy: [{ tahunAkademik: 'desc' }, { semester: 'asc' }],
      select: { id: true, nama: true, isActive: true },
      take: 3,
    });
    console.log('  daftar periode:', JSON.stringify(daftar, null, 1).replace(/\n/g, '\n  '));
  } catch (e) {
    console.log('  GAGAL findMany:', e.message.split('\n').slice(0, 4).join(' | '));
  }
  try {
    const total = await prisma.proposals.count();
    const perStatus = await prisma.proposals.groupBy({
      by: ['status'], _count: { _all: true },
    });
    console.log('  proposals.total() =', total);
    console.log('  perStatus =', perStatus.map((s) => `${s.status}:${s._count._all}`).join(', '));
  } catch (e) {
    console.log('  GAGAL proposals:', e.message.split('\n').slice(0, 4).join(' | '));
  }
  await prisma.$disconnect();
}
main();
