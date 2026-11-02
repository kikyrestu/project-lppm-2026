import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { PrismaClient } = req('@prisma/client');
const p = new PrismaClient();
const coba = async (nama, fn) => {
  try { const r = await fn(); console.log("  OK  ", nama, "->", JSON.stringify(r).slice(0, 120)); }
  catch (e) { console.log("  GAGAL", nama, "->", e.message.split("\n").filter(Boolean)[2] || e.message.slice(0,160)); }
};
await coba("proposals.count", () => p.proposals.count());
await coba("groupBy jenis", () => p.proposals.groupBy({ by: ["jenis"], _count: { _all: true } }));
await coba("groupBy status", () => p.proposals.groupBy({ by: ["status"], _count: { _all: true } }));
await coba("groupBy programStudiId", () => p.proposals.groupBy({ by: ["programStudiId"], _count: { _all: true } }));
await coba("groupBy periodeId", () => p.proposals.groupBy({ by: ["periodeId"], _count: { _all: true } }));
await coba("reviews.count", () => p.reviews.count());
await coba("programStudis.findMany", () => p.programStudis.findMany({ select: { id: true, nama: true } }));
await p.$disconnect();
