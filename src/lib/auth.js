// src/lib/auth.js — hashing password + JWT (jose, HS256)
// Dipakai: M1 Auth. Middleware memverifikasi token yang sama di Edge runtime.
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const COOKIE_NAME = 'lppm_token';
// Masa berlaku token. Diringkas dari 8 jam: JWT kita stateless (tidak ada
// daftar cabut token di server), sehingga token yang bocor tetap sah sampai
// kedaluwarsa. Jendela lebih pendek memperkecil dampak kebocoran.
// Lihat catatan "Pencabutan token" pada laporan keamanan.
export const MAX_AGE = 60 * 60 * 4; // 4 jam

// Hash dummy: dipakai saat NIDN tidak ditemukan supaya waktu respons
// tetap sama dengan saat password salah (mencegah user-enumeration via timing).
const DUMMY_HASH = '$2a$10$i3Np6QeLdNmuL2Ibty8greiwf/2Xi11x17wNNAeWHKvRwRd5PhV/e';

function secretKey() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET belum di-set di .env');
  return new TextEncoder().encode(s);
}

export function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash || DUMMY_HASH);
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}

// Set cookie httpOnly — token tidak bisa dibaca script di browser (mencegah XSS exfiltration).
export function setAuthCookie(token) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearAuthCookie() {
  cookies().delete(COOKIE_NAME);
}

// Baca sesi dari cookie. Return null bila tidak valid.
export async function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
