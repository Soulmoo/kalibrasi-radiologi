import { notFound } from "next/navigation";

/**
 * Bidang pelayanan = tab utama di samping Dashboard (Radiologi, Radioterapi,
 * kelak Kedokteran Nuklir). Setiap bidang punya segmen URL sendiri
 * (`/radiologi/...`, `/radioterapi/...`) dan deretan sub-tab sendiri.
 *
 * Bidang sengaja dibaca dari URL, bukan disimpan di cookie: tampilan tab
 * selalu cocok dengan halaman yang sedang dibuka, termasuk saat link dibuka di
 * tab baru atau lewat bookmark. Menambah bidang = menambah satu entri di sini
 * plus template-template-nya (Template.bidang) — tidak ada halaman yang perlu
 * disalin.
 *
 * File ini ikut terbawa ke komponen klien (nav), jadi jangan mengimpor
 * registry template dari sini. Pemetaan jenisAlat → bidang ada di
 * src/lib/templates/index.ts.
 */

export type KunciBidang = "radiologi" | "radioterapi";

export type MenuBidang = {
  /** path di bawah segmen bidang, mis. "/laporan" */
  sub: string;
  label: string;
};

export type Bidang = {
  key: KunciBidang;
  nama: string;
  /** label registry alat untuk bidang ini, mis. "Alat Radioterapi" */
  labelAlat: string;
  menu: MenuBidang[];
};

export const BIDANG: Bidang[] = [
  {
    key: "radiologi",
    nama: "Radiologi",
    labelAlat: "Alat Radiologi",
    menu: [
      { sub: "/laporan", label: "Laporan" },
      { sub: "/audit-dosis", label: "Audit Dosis" },
      { sub: "/instansi", label: "Instansi / Klien" },
      { sub: "/alat", label: "Alat Radiologi" },
      { sub: "/alat-ukur", label: "Registry Alat Ukur" },
    ],
  },
  {
    key: "radioterapi",
    nama: "Radioterapi",
    labelAlat: "Alat Radioterapi",
    // Audit dosis pasien (TPDI) hanya berlaku untuk radiologi diagnostik.
    menu: [
      { sub: "/laporan", label: "Laporan" },
      { sub: "/instansi", label: "Instansi / Klien" },
      { sub: "/alat", label: "Alat Radioterapi" },
      { sub: "/alat-ukur", label: "Registry Alat Ukur" },
    ],
  },
];

/** Bidang yang dipakai kalau tidak ada petunjuk lain (URL lama, data tanpa bidang). */
export const BIDANG_BAWAAN: KunciBidang = "radiologi";

export function getBidang(key: string | null | undefined): Bidang | undefined {
  return BIDANG.find((b) => b.key === key);
}

export function adalahBidang(key: string | null | undefined): key is KunciBidang {
  return getBidang(key) !== undefined;
}

/** Bidang dari segmen URL; segmen yang tidak dikenal → 404. */
export function pastikanBidang(key: string): Bidang {
  const b = getBidang(key);
  if (!b) notFound();
  return b;
}

/**
 * 404 untuk halaman yang tidak ada di menu bidang ini — mis. `/radioterapi/audit-dosis`.
 * Dipakai di halaman yang hanya tersedia untuk sebagian bidang.
 */
export function pastikanMenu(key: string, sub: string): Bidang {
  const b = pastikanBidang(key);
  if (!b.menu.some((m) => m.sub === sub)) notFound();
  return b;
}

/** Path lengkap di dalam satu bidang: rute("radiologi", "/laporan/abc") → "/radiologi/laporan/abc". */
export function rute(bidang: KunciBidang, sub: string): string {
  return `/${bidang}${sub}`;
}

/**
 * Bidang yang dikirim form sebagai field tersembunyi `bidang`. Dipakai aksi
 * untuk data lintas bidang (instansi, alat ukur umum) yang tidak bisa
 * diturunkan dari datanya sendiri — nilai tak dikenal jatuh ke bidang bawaan.
 */
export function bidangDariForm(fd: FormData): KunciBidang {
  const v = fd.get("bidang");
  return typeof v === "string" && adalahBidang(v) ? v : BIDANG_BAWAAN;
}
