// Rute uji guard role — hanya ADMIN yang boleh masuk (dijamin middleware).
import { ok } from '@/lib/api';
import { ctx } from '@/lib/api';

export async function GET(req) {
  const c = ctx(req);
  return ok({ message: 'Terverifikasi sebagai ADMIN', sebagai: { nidn: c.nidn, roles: c.roles } });
}
