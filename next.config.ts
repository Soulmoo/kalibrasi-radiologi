import type { NextConfig } from "next";

/**
 * Halaman yang sejak pemisahan bidang pindah ke bawah `/[bidang]/...`
 * (lihat src/lib/bidang.ts). Seluruh data lama adalah radiologi, jadi URL
 * lama diteruskan ke sana; laporan/alat bidang lain yang tersesat ke
 * `/radiologi/...` dialihkan lagi oleh halaman detailnya sendiri.
 */
const RUTE_LAMA = ["laporan", "alat", "alat-ukur", "instansi", "audit-dosis"];

const nextConfig: NextConfig = {
  async redirects() {
    return RUTE_LAMA.map((segmen) => ({
      // `:path*` juga cocok dengan nol segmen, jadi `/laporan` ikut tertangkap.
      source: `/${segmen}/:path*`,
      destination: `/radiologi/${segmen}/:path*`,
      permanent: true,
    }));
  },
};

export default nextConfig;
