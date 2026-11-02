// next.config.js — konfigurasi keamanan + hardening.
// Catatan: backend ini murni API (Route Handler). Tidak ada halaman, gambar,
// maupun Server Action, sehingga beberapa jalur exploitasi Next.js tidak terpakai.
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sembunyikan identitas framework dari header respons.
  poweredByHeader: false,

  // Optimisasi gambar dimatikan total: tidak ada pemakaian next/image,
  // sehingga pemangkas gambar tidak pernah dijalankan (jalur RCE advisory
  // GHSA-2xp9-vwfh-vxw4 / GHSA-2464-fhr4-w9xw tidak pernah terpanggil).
  images: { unoptimized: true },

  // Jangan pernah menampilkan source map di produksi.
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          // Cegah sniffing method via header tambahan.
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
