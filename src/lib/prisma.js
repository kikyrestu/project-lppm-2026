// src/lib/prisma.js — Singleton PrismaClient
// Next.js hot-reload bisa buka banyak koneksi kalau `new PrismaClient()` per file.
// Pola ini dipakai di semua service M1–M9.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
