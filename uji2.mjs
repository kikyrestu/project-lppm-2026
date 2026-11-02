import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { PrismaClient } = req('@prisma/client');
const p = new PrismaClient();
try {
  const d = await p.periodeAkademik.findMany({ take: 1 });
  console.log("  findMany polos OK, kolom:", Object.keys(d[0] || {}).join(', '));
} catch (e) {
  console.log("  GAGAL polos:", e.message.slice(0, 600));
}
await p.$disconnect();
