// src/middleware.js — verifikasi JWT + guard role per prefix rute.
// Berjalan di Edge runtime: jose (bukan jsonwebtoken) karena bcrypt/native tidak tersedia.
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'lppm_token';

// Batas ukuran body permintaan (byte). Mencegah payload raksasa memaksa
// engine validasi menghabiskan memori (lihat GHSA-mrhx-c7xc-m3w5 pada zod,
// dan advisory payload Server Action tak terbatas pada Next.js).
// 1 MB lebih dari cukup: request body kita hanya JSON metadata proposal.
const MAX_BODY_BYTES = 1024 * 1024;

// Rute yang tidak butuh sesi.
const PUBLIC_EXACT = new Set([
  '/', '/login', '/403',
  '/api/auth/login', '/api/auth/logout',
]);
const PUBLIC_PREFIX = ['/api/public', '/api/publik', '/berita', '/galeri', '/dokumen-publik'];

// Aturan role per prefix — urutan penting: yang paling spesifik dulu.
const ROLE_RULES = [
  { prefix: '/api/admin',      roles: ['ADMIN'] },
  { prefix: '/api/ketua',      roles: ['KETUA_STIKOM', 'KETUA_LPPM'] },
  { prefix: '/api/kaprodi',    roles: ['KAPRODI'] },
  { prefix: '/api/prodi',      roles: ['PRODI'] },
  { prefix: '/api/reviewer',   roles: ['REVIEWER'] },
  { prefix: '/api/verifikasi', roles: ['KAPRODI', 'ADMIN'] },
  { prefix: '/api/proposal',   roles: ['DOSEN', 'KAPRODI', 'ADMIN', 'KETUA_STIKOM', 'KETUA_LPPM', 'PRODI', 'REVIEWER'] },
  { prefix: '/api/akun',       roles: ['ADMIN'] },
];

function isPublic(pathname) {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIX.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Tolak permintaan dengan body melebihi batas SEBELUM body dibaca/diparse.
  // Dijalankan paling awal supaya payload besar tidak sempat mengonsumsi memori.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const cl = req.headers.get('content-length');
    const encoding = req.headers.get('content-encoding');
    if (cl !== null && Number(cl) > MAX_BODY_BYTES) {
      return deny(req, 413, 'PAYLOAD_TOO_LARGE',
        `Ukuran permintaan melebihi batas ${Math.floor(MAX_BODY_BYTES / 1024)} KB.`);
    }
    // Body terkompresi: Content-Length mentah tidak mewakili ukuran asli.
    // Transfer-Encoding chunked tanpa Content-Length juga harus dibatasi.
    if (encoding && encoding !== 'identity') {
      return deny(req, 413, 'PAYLOAD_TOO_LARGE', 'Kompresi body tidak didukung.');
    }
    if (cl === null && (req.headers.get('transfer-encoding') || '').includes('chunked')) {
      return deny(req, 413, 'PAYLOAD_TOO_LARGE',
        'Permintaan tanpa Content-Length tidak diizinkan.');
    }
  }

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return deny(req, 401, 'UNAUTHENTICATED', 'Belum login');

  let payload;
  try {
    ({ payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET)));
  } catch {
    // Token kedaluwarsa / rusak / signature salah -> buang cookie agar browser bersih.
    const res = deny(req, 401, 'SESSION_INVALID', 'Sesi kedaluwarsa, silakan login ulang');
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  const roles = payload.roles || [];
  const rule = ROLE_RULES.find((r) => pathname.startsWith(r.prefix));
  if (rule && !roles.some((r) => rule.roles.includes(r))) {
    return deny(req, 403, 'FORBIDDEN', `Rute ini khusus role: ${rule.roles.join(', ')}`);
  }

  // Sisipkan identitas ke header agar handler tidak perlu decode JWT lagi.
  const headers = new Headers(req.headers);
  headers.set('x-user-id', payload.sub);
  headers.set('x-user-nidn', payload.nidn);
  headers.set('x-user-roles', roles.join(','));

  return NextResponse.next({ request: { headers } });
}

function deny(req, status, code, message) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, code, message }, { status });
  }
  // Untuk halaman non-API: arahkan ke /login dengan pemicu kembali.
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Abaikan aset statis, supaya middleware tidak menghambat muat gambar/CSS/JS.
  matcher: ['/((?!_next/static|_next/image|favicon\.ico|.*\.(?:png|jpg|jpeg|svg|webp|css|js)$).*)'],
};
