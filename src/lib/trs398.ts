/**
 * Dosimetri berkas foton energi tinggi — IAEA TRS-398 Rev.1 (2024), Bagian 6.
 *
 * Data dan rumus di file ini disalin dari TRS-398 Rev.1, bukan dari edisi
 * 2000 (spreadsheet IAEA v1.06 "Absolut 6 MV TRS-398.xlsm"). Perbedaan yang
 * disengaja terhadap spreadsheet itu:
 *
 * - k_Q tidak lagi diinterpolasi dari tabel, melainkan dihitung dengan
 *   Eq. (34) dari konstanta a, b per chamber (Tabel 45). Daftar chamber-nya
 *   pun berbeda: beberapa chamber lama (NE 2505, Victoreen, dsb.) tidak ada
 *   lagi di Rev.1, sedangkan chamber baru (Exradin A26/A28, IBA CC25, PTW
 *   31021/31022, Sun Nuclear) masuk.
 * - k_TP memakai 273,15 (spreadsheet: 273,2).
 * - Koefisien k_s hanya untuk V₁/V₂ = 2–5 (Tabel 10; edisi 2000 sampai 10).
 * - Ada faktor baru k_vol untuk berkas FFF (Eq. 22).
 *
 * Kalau IAEA menerbitkan revisi berikutnya, ganti tabel/rumus di sini dan
 * perbarui SUMBER_TRS398 — itu mengikuti edisi baru, bukan perbaikan bug.
 */
import type { Angka } from "@/lib/calc";

export const SUMBER_TRS398 = "IAEA TRS-398 Rev.1 (2024)";

/* ---------------- Chamber (Tabel 45 + Tabel 4) ---------------- */

export type ChamberFoton = {
  nama: string;
  /** konstanta Eq. (34), Tabel 45 */
  a: number;
  b: number;
  /**
   * Karakteristik menurut pabrikan, Tabel 4 — hanya tersedia untuk sebagian
   * chamber. Panjang rongga dipakai k_vol berkas FFF.
   */
  volumeCm3?: number;
  panjangRonggaMm?: number;
  dinding?: string;
  /** tebal dinding, g/cm² */
  tebalDinding?: number;
  /** kedap air menurut Tabel 4 — kalau tidak, butuh selubung PMMA ≤ 1 mm (§6.2.2) */
  kedapAir?: boolean;
};

export const CHAMBER_FOTON: ChamberFoton[] = [
  { nama: "Capintec PR-06C Farmer", a: 1.06833, b: -0.08262 },
  { nama: "Exradin A1SL Miniature", a: 1.21633, b: -0.13351 },
  { nama: "Exradin A12 Farmer", a: 1.09783, b: -0.09544, volumeCm3: 0.64, dinding: "C-552", tebalDinding: 0.088, kedapAir: true },
  { nama: "Exradin A12S Short Farmer", a: 1.11499, b: -0.10057 },
  { nama: "Exradin A18", a: 1.10487, b: -0.0967 },
  { nama: "Exradin A19 Classic Farmer", a: 1.12024, b: -0.10493, volumeCm3: 0.62, dinding: "C-552", tebalDinding: 0.088, kedapAir: true },
  { nama: "Exradin A26", a: 1.09587, b: -0.09383 },
  { nama: "Exradin A28", a: 1.12453, b: -0.10278 },
  { nama: "IBA CC13", a: 1.11441, b: -0.1026, volumeCm3: 0.13, panjangRonggaMm: 5.8, dinding: "C-552", tebalDinding: 0.07, kedapAir: true },
  { nama: "IBA CC25", a: 1.08981, b: -0.09254 },
  { nama: "IBA FC23-C Short Farmer", a: 1.09189, b: -0.09346 },
  { nama: "IBA FC65-G Farmer", a: 1.09752, b: -0.09642, volumeCm3: 0.65, panjangRonggaMm: 23.0, dinding: "Grafit", tebalDinding: 0.073, kedapAir: true },
  { nama: "IBA FC65-P Farmer", a: 1.12374, b: -0.10784, volumeCm3: 0.65, panjangRonggaMm: 23.0, dinding: "POM", tebalDinding: 0.057, kedapAir: true },
  { nama: "NE 2561/2611A Secondary Standard", a: 1.07699, b: -0.08732 },
  { nama: "NE 2571 Farmer", a: 1.08918, b: -0.09222, volumeCm3: 0.69, panjangRonggaMm: 24.1, dinding: "Grafit", tebalDinding: 0.065, kedapAir: false },
  { nama: "PTW 30010 Farmer", a: 1.12594, b: -0.1074, volumeCm3: 0.6, panjangRonggaMm: 23.0, dinding: "PMMA/grafit", tebalDinding: 0.057, kedapAir: false },
  { nama: "PTW 30011 Farmer", a: 1.1085, b: -0.10107 },
  { nama: "PTW 30012 Farmer", a: 1.12442, b: -0.10415, volumeCm3: 0.6, panjangRonggaMm: 23.0, dinding: "Grafit", tebalDinding: 0.079, kedapAir: false },
  { nama: "PTW 30013 Farmer", a: 1.18273, b: -0.13256, volumeCm3: 0.6, panjangRonggaMm: 23.0, dinding: "PMMA/grafit", tebalDinding: 0.057, kedapAir: true },
  { nama: "PTW 31010 Semiflex", a: 1.23755, b: -0.15295, volumeCm3: 0.13, panjangRonggaMm: 6.5, dinding: "PMMA/grafit", tebalDinding: 0.078, kedapAir: true },
  { nama: "PTW 31013 Semiflex", a: 1.19297, b: -0.13366, volumeCm3: 0.3, panjangRonggaMm: 16.3, dinding: "PMMA/grafit", tebalDinding: 0.078, kedapAir: true },
  { nama: "PTW 31016 PinPoint 3D", a: 1.1165, b: -0.10841 },
  { nama: "PTW 31021 Semiflex 3D", a: 1.29612, b: -0.16514, volumeCm3: 0.07, panjangRonggaMm: 4.8, dinding: "PMMA/grafit", tebalDinding: 0.084, kedapAir: true },
  { nama: "PTW 31022 PinPoint 3D", a: 1.14435, b: -0.1113 },
  { nama: "Sun Nuclear SNC125c", a: 1.097, b: -0.09749 },
  { nama: "Sun Nuclear SNC600c Farmer", a: 1.068, b: -0.08485 },
];

/** Pilihan untuk chamber di luar Tabel 45 — k_Q wajib diisi manual. */
export const CHAMBER_LAINNYA = "Lainnya (k_Q diisi manual)";

export function cariChamber(nama: string | undefined): ChamberFoton | undefined {
  return CHAMBER_FOTON.find((c) => c.nama === nama);
}

/* ---------------- k_Q (Eq. 34) ---------------- */

/** Rentang TPR₂₀,₁₀ Tabel 16 — di luar rentang ini k_Q tidak diekstrapolasi. */
export const TPR_MIN = 0.56;
export const TPR_MAX = 0.82;

/**
 * k_Q = [1 + exp((a − 0,57)/b)] / [1 + exp((a − TPR₂₀,₁₀)/b)] — Eq. (34).
 * 0,57 adalah TPR₂₀,₁₀ rerata berkas ⁶⁰Co, jadi k_Q(0,57) = 1 tepat.
 *
 * Dengan a, b Tabel 45 hasilnya sama dengan Tabel 16 sampai 4 desimal, kecuali
 * sesekali berselisih 0,0001 (mis. SNC600c pada 0,56) — Tabel 16 tampaknya
 * dihitung dari konstanta yang belum dibulatkan. Jauh di bawah ketidakpastian
 * k_Q sendiri (0,6 %, Tabel 46).
 */
export function kQFoton(chamber: ChamberFoton, tpr: Angka): Angka {
  if (tpr === null || tpr < TPR_MIN || tpr > TPR_MAX) return null;
  const f = (x: number) => 1 + Math.exp((chamber.a - x) / chamber.b);
  return f(0.57) / f(tpr);
}

/* ---------------- Faktor koreksi besaran pengaruh (§4.4.3) ---------------- */

/** k_TP = (273,15 + T)/(273,15 + T₀) · P₀/P — Eq. (10); P dalam kPa, T dalam °C. */
export function kTP(t: Angka, p: Angka, t0: Angka, p0: Angka): Angka {
  if (t === null || p === null || t0 === null || p0 === null || p === 0) return null;
  return ((273.15 + t) / (273.15 + t0)) * (p0 / p);
}

/**
 * k_pol = (|M₊| + |M₋|) / 2M — Eq. (11). M = bacaan pada polaritas yang
 * dipakai rutin. Rasio dua nilai k_pol ini (kualitas Q terhadap Q₀) adalah
 * Eq. (12), dipakai bila laboratorium kalibrasi belum mengoreksi efek polaritas.
 */
export function kPol(mPlus: Angka, mMinus: Angka, m: Angka): Angka {
  if (mPlus === null || mMinus === null || m === null || m === 0) return null;
  return (Math.abs(mPlus) + Math.abs(mMinus)) / (2 * Math.abs(m));
}

export type JenisBerkas = "pulsed" | "pulsed-scanned";

/** Koefisien a₀, a₁, a₂ teknik dua tegangan — Tabel 10. */
const TABEL_KS: { n: number; pulsed: [number, number, number]; scanned: [number, number, number] }[] = [
  { n: 2.0, pulsed: [2.337, -3.636, 2.299], scanned: [4.711, -8.242, 4.533] },
  { n: 2.5, pulsed: [1.474, -1.587, 1.114], scanned: [2.719, -3.977, 2.261] },
  { n: 3.0, pulsed: [1.198, -0.875, 0.677], scanned: [2.001, -2.402, 1.404] },
  { n: 3.5, pulsed: [1.08, -0.542, 0.463], scanned: [1.665, -1.647, 0.984] },
  { n: 4.0, pulsed: [1.022, -0.363, 0.341], scanned: [1.468, -1.2, 0.734] },
  { n: 5.0, pulsed: [0.975, -0.188, 0.214], scanned: [1.279, -0.75, 0.474] },
];

export const KS_N_MIN = TABEL_KS[0].n;
export const KS_N_MAX = TABEL_KS[TABEL_KS.length - 1].n;

/**
 * Koefisien Tabel 10 untuk V₁/V₂ = n. Di antara baris tabel, a_i
 * diinterpolasi linear — sama seperti fungsi `Interpolate` di spreadsheet
 * IAEA v1.06. Di luar 2–5 → null (tidak diekstrapolasi).
 */
export function koefisienKs(n: Angka, jenis: JenisBerkas): [number, number, number] | null {
  if (n === null || n < KS_N_MIN || n > KS_N_MAX) return null;
  const kol = jenis === "pulsed" ? "pulsed" : "scanned";
  for (let i = 1; i < TABEL_KS.length; i++) {
    const hi = TABEL_KS[i];
    if (n <= hi.n) {
      const lo = TABEL_KS[i - 1];
      const t = (n - lo.n) / (hi.n - lo.n);
      return [0, 1, 2].map((j) => lo[kol][j] + (hi[kol][j] - lo[kol][j]) * t) as [
        number,
        number,
        number,
      ];
    }
  }
  return TABEL_KS[0][kol];
}

/** k_s = a₀ + a₁(M₁/M₂) + a₂(M₁/M₂)² — Eq. (13), berkas berpulsa. */
export function ksDuaTegangan(n: Angka, rasioM: Angka, jenis: JenisBerkas): Angka {
  const a = koefisienKs(n, jenis);
  if (!a || rasioM === null) return null;
  return a[0] + a[1] * rasioM + a[2] * rasioM * rasioM;
}

/**
 * Pendekatan k_s = (n − 1)/(n − M₁/M₂) — Eq. (14). Berlaku (dalam 0,1 %)
 * untuk k_s < 1,03 dan juga untuk n yang tidak ada di Tabel 10, sehingga
 * dipakai sebagai cek silang Eq. (13).
 */
export function ksPendekatan(n: Angka, rasioM: Angka): Angka {
  if (n === null || rasioM === null || n - rasioM === 0) return null;
  return (n - 1) / (n - rasioM);
}

/**
 * Koreksi perata-rataan volume berkas FFF — Eq. (22):
 * k_vol = 1 + (0,0062·TPR₂₀,₁₀ − 0,0036)·(100/SDD)²·L², L dan SDD dalam cm.
 *
 * Catatan: Tabel 11 Rev.1 ("SDD = 110 cm") beberapa selnya 0,001 lebih tinggi
 * daripada persamaan ini pada SDD 110 cm — seluruh isinya justru cocok dengan
 * SDD ≈ 105 cm. Yang dipakai di sini persamaannya, sama dengan worksheet §6.9,
 * dengan SDD yang sebenarnya dari set-up pengukuran.
 */
export function kVolFFF(tpr: Angka, panjangCm: Angka, sddCm: Angka): Angka {
  if (tpr === null || panjangCm === null || sddCm === null || sddCm === 0) return null;
  return 1 + (0.0062 * tpr - 0.0036) * (100 / sddCm) ** 2 * panjangCm ** 2;
}

/* ---------------- Batas pemeriksaan chamber (Tabel 3) ---------------- */

/** Efek polaritas chamber kelas acuan < 0,4 % dari bacaan. */
export const BATAS_EFEK_POLARITAS_PERSEN = 0.4;
/** k_s di atas 1,05 → metode lain (§4.4.3.4, Tabel 3). */
export const BATAS_KS = 1.05;
/** Eq. (14) sepakat dengan Eq. (13) dalam 0,1 % untuk k_s < 1,03. */
export const BATAS_SELISIH_KS_PERSEN = 0.1;
export const KS_BERLAKU_PENDEKATAN = 1.03;

/** Ketidakpastian standar gabungan D_w,Q tipikal, Tabel 17 (k = 1). */
export const KETIDAKPASTIAN_DW_PERSEN = 1.0;
