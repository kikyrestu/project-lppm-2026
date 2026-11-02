// src/lib/api.js — pembungkus respons API supaya format JSON seragam
import { NextResponse } from 'next/server';

export function ok(data = {}, init = {}) {
  return NextResponse.json({ ok: true, ...data }, { status: 200, ...init });
}

export function fail(status, code, message, extra = {}) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

// Ambil payload sesi dari header yang disisipkan middleware.
export function ctx(req) {
  const roles = (req.headers.get('x-user-roles') || '').split(',').filter(Boolean);
  return {
    userId: req.headers.get('x-user-id') || null,
    nidn: req.headers.get('x-user-nidn') || null,
    roles,
    // helper guard role di level handler (defense-in-depth di samping middleware)
    hasRole: (r) => roles.includes(r),
  };
}
