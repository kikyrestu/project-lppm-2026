// POST /api/auth/login — login dengan NIDN + password
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { z } from 'zod';

const Body = z.object({
  nidn: z.string().trim().min(1, 'NIDN wajib diisi').max(20),
  password: z.string().min(1, 'Password wajib diisi').max(200),
});

export async function POST(req) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail(400, 'VALIDATION', 'Format permintaan tidak valid', {
      detail: parsed.error.issues.map((i) => i.message),
    });
  }
  const { nidn, password } = parsed.data;

  const user = await prisma.users.findUnique({
    where: { nidn },
    include: { roles: { select: { role: true } }, programStudi: { select: { kode: true, nama: true } } },
  });

  // Pesan dibuat sama untuk "NIDN tidak ada" dan "password salah"
  // agar akun tidak bisa ditebak keberadaannya.
  const GENERIC = 'NIDN atau password salah';

  // verifyPassword tetap dijalankan walau user tidak ada (pakai hash dummy)
  // supaya waktu respons identik -> mencegah user-enumeration via timing.
  const passOk = await verifyPassword(password, user?.passwordHash);
  if (!user || !passOk) return fail(401, 'UNAUTHORIZED', GENERIC);

  if (user.status !== 'AKTIF') {
    return fail(403, 'ACCOUNT_DISABLED', 'Akun dinonaktifkan. Hubungi administrator.');
  }

  const roles = user.roles.map((r) => r.role);
  const token = await signToken({ sub: user.id, nidn: user.nidn, nama: user.nama, roles });
  setAuthCookie(token);

  return ok({
    message: 'Login berhasil',
    user: {
      id: user.id,
      nidn: user.nidn,
      nama: user.nama,
      roles,
      programStudi: user.programStudi ?? null,
    },
  });
}
