import { deviasiPersen, fmt, fmtSig, num, type Angka } from "@/lib/calc";
import {
  BATAS_EFEK_POLARITAS_PERSEN,
  BATAS_KS,
  BATAS_SELISIH_KS_PERSEN,
  CHAMBER_FOTON,
  CHAMBER_LAINNYA,
  KETIDAKPASTIAN_DW_PERSEN,
  KS_BERLAKU_PENDEKATAN,
  KS_N_MAX,
  KS_N_MIN,
  SUMBER_TRS398,
  TPR_MAX,
  TPR_MIN,
  cariChamber,
  kPol,
  kQFoton,
  kTP,
  kVolFFF,
  ksDuaTegangan,
  ksPendekatan,
  type ChamberFoton,
} from "@/lib/trs398";
import { REKOMENDASI_DEFAULT, seksiKondisiLingkungan } from "./common";
import type {
  Blok,
  HasilUji,
  KonteksHitung,
  Kolom,
  RingkasanItem,
  Template,
  Verdict,
} from "./types";

/**
 * Pesawat LINAC — penentuan dosis serap air berkas foton energi tinggi,
 * IAEA TRS-398 Rev.1 (2024) Bagian 6. Satu laporan = satu energi foton.
 *
 * Urutan seksi mengikuti worksheet §6.9 (A–E = bagian 1–5 worksheet). Semua
 * isian adalah blok baris-tetap dua kolom (Parameter | Nilai); hasil hitung
 * ada di blok tersendiri yang membaca seluruh isian lewat `ctx.all`. Rumus dan
 * datanya di src/lib/trs398.ts.
 *
 * Satu-satunya verdict ada di blok keluaran: deviasi D(z_max) terhadap nilai
 * acuan, dibandingkan dengan batas (%) yang DIISI FISMED — TRS-398 sendiri
 * tidak menetapkan toleransi keluaran. Pemeriksaan chamber (Tabel 3) sengaja
 * tanpa verdict supaya masalah chamber tidak membuat LINAC "Tidak Laik Pakai".
 *
 * Key blok/baris dan teks opsi tersimpan apa adanya di hasilUji — mengubahnya
 * berarti migrasi data (lihat normalisasiHasil).
 */

/* ---------------- Opsi ---------------- */

const MODE_WFF = "WFF";
const MODE_FFF = "FFF";
const SETUP_SSD = "SSD";
const SETUP_SAD = "SAD";
const Q0_CO60 = "Co-60";
const Q0_FOTON = "Berkas foton";
const POL_POSITIF = "Positif";
const POL_NEGATIF = "Negatif";
const POL_TERKOREKSI = "Terkoreksi efek polaritas";
const YA = "Ya";
const TIDAK = "Tidak";
const BERKAS_PULSED = "Pulsed";
const BERKAS_SCANNED = "Pulsed-scanned";

/* ---------------- Kolom ---------------- */

const KOLOM_ISIAN: Kolom[] = [
  { key: "_label", label: "Parameter", jenis: "label", lebar: "55%" },
  { key: "nilai", label: "Nilai", jenis: "text" },
];

/** Blok hasil: nilai & keterangan diformat per baris oleh `hitungTeks`. */
function kolomHasil(
  nilai: (key: string, h: HasilTrs398) => string,
  keterangan: (key: string, h: HasilTrs398) => string,
): Kolom[] {
  return [
    { key: "_label", label: "Besaran", jenis: "label", lebar: "40%" },
    {
      key: "nilai",
      label: "Nilai",
      jenis: "hitung",
      lebar: "20%",
      hitungTeks: (b, ctx) => nilai(b._key, hitungTrs398(ctx.all)),
    },
    {
      key: "keterangan",
      label: "Keterangan",
      jenis: "hitung",
      hitungTeks: (b, ctx) => keterangan(b._key, hitungTrs398(ctx.all)),
    },
  ];
}

/* ---------------- Rantai hitung ---------------- */

function sel(all: HasilUji, blokId: string, key: string): string {
  return (all[blokId]?.rows.find((r) => r._key === key)?.nilai ?? "").trim();
}

function chamberDipilih(ctx: KonteksHitung): ChamberFoton | undefined {
  return cariChamber(sel(ctx.all, "rt-chamber", "model"));
}

export type HasilTrs398 = {
  chamber: ChamberFoton | undefined;
  tpr: Angka;
  m1: Angka;
  ktp: Angka;
  kelec: Angka;
  kelecTerpisah: boolean;
  kpol: Angka;
  kpolQ0: Angka;
  kpolDiukur: boolean;
  kpolTermodifikasi: boolean;
  n: Angka;
  rasioM: Angka;
  ks: Angka;
  ksEq14: Angka;
  ksDiukur: boolean;
  ksLuarTabel: boolean;
  fff: boolean;
  kvol: Angka;
  kvolManual: boolean;
  panjangCm: Angka;
  sdd: Angka;
  mq: Angka;
  kq: Angka;
  sumberKq: string;
  ndw: Angka;
  /** N_D,w apa adanya seperti diketik — nilai isian tidak pernah dibulatkan */
  ndwTeks: string;
  satuanNdw: string;
  dwZref: Angka;
  setupSad: boolean;
  dwZmax: Angka;
  dwZmaxCgy: Angka;
  acuan: Angka;
  deviasi: Angka;
  batas: Angka;
};

/**
 * Seluruh rantai TRS-398 dari isian mentah. Dipanggil ulang tiap sel —
 * hitungannya murah, dan dengan begitu tidak ada nilai terhitung yang
 * disimpan (sesuai konvensi Laporan.hasilUji).
 *
 * Faktor yang tidak diukur (bacaan polaritas berlawanan atau M₂ kosong)
 * dianggap 1 dan ditandai di keterangan — sama perilakunya dengan
 * spreadsheet IAEA, supaya D_w tetap bisa dihitung.
 */
export function hitungTrs398(all: HasilUji): HasilTrs398 {
  const acuan = (k: string) => sel(all, "rt-kondisi-acuan", k);
  const ch = (k: string) => sel(all, "rt-chamber", k);
  const el = (k: string) => sel(all, "rt-elektrometer", k);
  const bc = (k: string) => sel(all, "rt-bacaan", k);
  const zm = (k: string) => sel(all, "rt-zmax", k);

  const chamber = cariChamber(ch("model"));
  const tpr = num(acuan("tpr"));

  // M₁ = bacaan / MU
  const m = num(bc("bacaan"));
  const mu = num(bc("mu"));
  const m1 = m !== null && mu !== null && mu !== 0 ? m / mu : null;

  const ktp = kTP(num(bc("t")), num(bc("p")), num(ch("t0")), num(ch("p0")));

  // Worksheet §6.9 catatan c: elektrometer yang tidak dikalibrasi terpisah → k_elec = 1.
  const kelecTerpisah = el("terpisah") === YA;
  const kelec = kelecTerpisah ? num(el("kelec")) : 1;

  // k_pol: bacaan pada polaritas pengguna + polaritas berlawanan.
  const lawan = num(bc("bacaanLawan"));
  const penggunaNegatif = ch("polUser") === POL_NEGATIF;
  const kpolDiukur = m !== null && lawan !== null;
  const kpolQ = kpolDiukur
    ? kPol(penggunaNegatif ? lawan : m, penggunaNegatif ? m : lawan, m)
    : 1;
  const polKal = ch("polKal");
  const kpolTermodifikasi = polKal === POL_POSITIF || polKal === POL_NEGATIF;
  let kpolQ0: Angka = null;
  let kpol: Angka = kpolQ;
  if (kpolTermodifikasi) {
    // Eq. (12): lab belum mengoreksi polaritas → bagi dengan [k_pol]Q₀.
    const plusQ0 = num(bc("mPlusQ0"));
    const minQ0 = num(bc("mMinQ0"));
    kpolQ0 = kPol(plusQ0, minQ0, polKal === POL_POSITIF ? plusQ0 : minQ0);
    kpol = kpolQ !== null && kpolQ0 !== null ? kpolQ / kpolQ0 : null;
  }

  // k_s: dua tegangan, M₁ = bacaan pada V₁.
  const v1 = num(ch("v1"));
  const v2 = num(bc("v2"));
  const m2 = num(bc("m2"));
  const ksDiukur = v1 !== null && v2 !== null && m2 !== null && m !== null;
  const n = ksDiukur && v2 !== 0 ? v1! / v2! : null;
  const rasioM = ksDiukur && m2 !== 0 ? m! / m2! : null;
  const jenis = bc("jenisBerkas") === BERKAS_SCANNED ? "pulsed-scanned" : "pulsed";
  const ksEq13 = ksDuaTegangan(n, rasioM, jenis);
  const ksEq14 = ksPendekatan(n, rasioM);
  // V₁/V₂ di luar Tabel 10: pakai Eq. (14), yang memang dimaksudkan untuk n bebas.
  const ksLuarTabel = ksDiukur && n !== null && (n < KS_N_MIN || n > KS_N_MAX);
  const ks = !ksDiukur ? 1 : ksLuarTabel ? ksEq14 : ksEq13;

  // k_vol: hanya berkas FFF.
  const fff = acuan("mode") === MODE_FFF;
  const setupSad = acuan("setup") === SETUP_SAD;
  const jarak = num(acuan("jarak"));
  const zref = num(acuan("zref"));
  const sdd = jarak === null ? null : setupSad ? jarak : zref === null ? null : jarak + zref;
  const kvolIsian = num(bc("kvolManual"));
  const panjangCm =
    num(bc("panjangRongga")) ??
    (chamber?.panjangRonggaMm !== undefined ? chamber.panjangRonggaMm / 10 : null);
  const kvolManual = fff && kvolIsian !== null;
  const kvol = !fff ? 1 : kvolManual ? kvolIsian : kVolFFF(tpr, panjangCm, sdd);

  const faktor = [m1, ktp, kelec, kpol, ks, kvol];
  const mq = faktor.every((x) => x !== null)
    ? faktor.reduce<number>((a, b) => a * (b as number), 1)
    : null;

  // k_Q: isian manual (mis. dari sertifikat lab) selalu didahulukan.
  const kqIsian = num(ch("kqManual"));
  let kq: Angka = null;
  let sumberKq = "-";
  if (kqIsian !== null) {
    kq = kqIsian;
    sumberKq = "Diisi manual (mis. dari sertifikat laboratorium)";
  } else if (ch("q0") === Q0_FOTON) {
    sumberKq = "Q₀ berkas foton: isi k_Q,Q₀ dari laboratorium kalibrasi (§6.5.2)";
  } else if (!chamber) {
    sumberKq = "Pilih model chamber dari Tabel 45, atau isi k_Q manual";
  } else if (tpr === null) {
    sumberKq = "Isi TPR₂₀,₁₀";
  } else if (tpr < TPR_MIN || tpr > TPR_MAX) {
    sumberKq = `TPR₂₀,₁₀ di luar rentang Tabel 16 (${TPR_MIN}–${TPR_MAX}); isi k_Q manual`;
  } else {
    kq = kQFoton(chamber, tpr);
    sumberKq = `Eq. (34), Tabel 45: a = ${chamber.a}, b = ${chamber.b}`;
  }

  const ndw = num(ch("ndw"));
  const dwZref = mq !== null && ndw !== null && kq !== null ? mq * ndw * kq : null;

  let dwZmax: Angka = null;
  if (dwZref !== null) {
    if (setupSad) {
      const tmr = num(zm("tmr"));
      dwZmax = tmr ? dwZref / tmr : null;
    } else {
      const pdd = num(zm("pdd"));
      dwZmax = pdd ? (100 * dwZref) / pdd : null;
    }
  }
  const dwZmaxCgy = dwZmax === null ? null : dwZmax * 100;
  const nilaiAcuan = num(zm("acuan"));

  return {
    chamber,
    tpr,
    m1,
    ktp,
    kelec,
    kelecTerpisah,
    kpol,
    kpolQ0,
    kpolDiukur,
    kpolTermodifikasi,
    n,
    rasioM,
    ks,
    ksEq14,
    ksDiukur,
    ksLuarTabel,
    fff,
    kvol,
    kvolManual,
    panjangCm,
    sdd,
    mq,
    kq,
    sumberKq,
    ndw,
    ndwTeks: ch("ndw"),
    satuanNdw: ch("satuanNdw") || "Gy/nC",
    dwZref,
    setupSad,
    dwZmax,
    dwZmaxCgy,
    acuan: nilaiAcuan,
    deviasi: deviasiPersen(dwZmaxCgy, nilaiAcuan),
    batas: num(zm("batas")),
  };
}

/** Satuan bacaan per MU mengikuti satuan N_D,w (Gy/nC → nC/MU, Gy/rdg → rdg/MU). */
function satuanBacaan(h: HasilTrs398) {
  return h.satuanNdw === "Gy/rdg" ? "rdg/MU" : "nC/MU";
}

/* ---------------- Blok ---------------- */

const blokKondisiAcuan: Blok = {
  id: "rt-kondisi-acuan",
  judul: "Unit Radiasi dan Kondisi Acuan Penentuan D_w,Q",
  catatan: "Kondisi acuan Tabel 15: phantom air, z_ref 10 g/cm², SSD/SCD 100 cm, lapangan 10 cm × 10 cm.",
  modeBaris: "tetap",
  tanpaEvaluasi: true,
  kolom: KOLOM_ISIAN,
  baris: [
    { key: "energi", label: "Energi nominal (MV)", placeholder: "6" },
    { key: "mode", label: "Mode berkas", opsi: [MODE_WFF, MODE_FFF], awal: { nilai: MODE_WFF } },
    { key: "lajuDosis", label: "Laju dosis nominal (MU/min)", placeholder: "600" },
    { key: "tpr", label: "Kualitas berkas, TPR₂₀,₁₀", placeholder: "0.670" },
    { key: "setup", label: "Set-up", opsi: [SETUP_SSD, SETUP_SAD], awal: { nilai: SETUP_SSD } },
    { key: "jarak", label: "Jarak acuan, SSD atau SAD (cm)", awal: { nilai: "100" } },
    { key: "lapangan", label: "Luas lapangan acuan (cm × cm)", awal: { nilai: "10 × 10" } },
    { key: "zref", label: "Kedalaman acuan, z_ref (g/cm²)", awal: { nilai: "10" } },
    { key: "phantom", label: "Phantom acuan", awal: { nilai: "Air" } },
  ],
};

const blokChamber: Blok = {
  id: "rt-chamber",
  judul: "Ion Chamber",
  catatan:
    "Pilih chamber dari Tabel 45 TRS-398 Rev.1 supaya k_Q dihitung dengan Eq. (34). " +
    "Chamber lain → pilih “Lainnya” dan isi k_Q manual.",
  modeBaris: "tetap",
  tanpaEvaluasi: true,
  kolom: KOLOM_ISIAN,
  baris: [
    { key: "model", label: "Model ion chamber", opsi: [...CHAMBER_FOTON.map((c) => c.nama), CHAMBER_LAINNYA] },
    { key: "seri", label: "Nomor seri chamber" },
    // Dinding & kedap-air terisi dari Tabel 4 menurut model (seperti VLOOKUP
    // di spreadsheet IAEA); tetap bisa ditimpa. Chamber tanpa data Tabel 4 → isi manual.
    {
      key: "dindingBahan",
      label: "Dinding chamber — bahan",
      placeholder: "tidak ada di Tabel 4, isi manual",
      otomatis: { nilai: (ctx) => chamberDipilih(ctx)?.dinding ?? "" },
    },
    {
      key: "dindingTebal",
      label: "Dinding chamber — tebal (g/cm²)",
      placeholder: "tidak ada di Tabel 4, isi manual",
      otomatis: { nilai: (ctx) => chamberDipilih(ctx)?.tebalDinding?.toString() ?? "" },
    },
    {
      key: "sleeveBahan",
      label: "Selubung kedap air — bahan",
      placeholder: "PMMA",
      otomatis: {
        nilai: (ctx) => (chamberDipilih(ctx)?.kedapAir ? "Tidak diperlukan (chamber kedap air)" : ""),
      },
    },
    {
      key: "sleeveTebal",
      label: "Selubung kedap air — tebal (g/cm²)",
      // §6.2.2: PMMA sebaiknya ≤ 1,0 mm → ≤ 0,119 g/cm² (ρ PMMA 1,19 g/cm³).
      placeholder: "≤ 0.119",
    },
    { key: "jendelaBahan", label: "Jendela phantom — bahan (berkas horizontal)", placeholder: "-" },
    { key: "jendelaTebal", label: "Jendela phantom — tebal (g/cm²)", placeholder: "-" },
    { key: "ndw", label: "Koefisien kalibrasi dosis serap air, N_D,w,Q₀" },
    { key: "satuanNdw", label: "Satuan N_D,w,Q₀", opsi: ["Gy/nC", "Gy/rdg"], awal: { nilai: "Gy/nC" } },
    { key: "q0", label: "Kualitas kalibrasi, Q₀", opsi: [Q0_CO60, Q0_FOTON], awal: { nilai: Q0_CO60 } },
    { key: "tprQ0", label: "TPR₂₀,₁₀ Q₀ (bila Q₀ berkas foton)" },
    { key: "kqManual", label: "k_Q,Q₀ manual (opsional — mengalahkan Eq. 34)" },
    { key: "kedalamanKal", label: "Kedalaman kalibrasi (g/cm²)", awal: { nilai: "5" } },
    { key: "p0", label: "Tekanan acuan kalibrasi, P₀ (kPa)", awal: { nilai: "101.325" } },
    { key: "t0", label: "Suhu acuan kalibrasi, T₀ (°C)", awal: { nilai: "20" } },
    { key: "rh0", label: "Kelembapan acuan kalibrasi (%)", awal: { nilai: "50" } },
    { key: "v1", label: "Tegangan polarisasi, V₁ (V)", placeholder: "300" },
    {
      key: "polKal",
      label: "Polaritas saat kalibrasi",
      opsi: [POL_POSITIF, POL_NEGATIF, POL_TERKOREKSI],
      awal: { nilai: POL_TERKOREKSI },
    },
    { key: "polUser", label: "Polaritas pengguna", opsi: [POL_POSITIF, POL_NEGATIF], awal: { nilai: POL_POSITIF } },
    { key: "lab", label: "Laboratorium kalibrasi" },
    { key: "tglKal", label: "Tanggal kalibrasi" },
  ],
};

const blokElektrometer: Blok = {
  id: "rt-elektrometer",
  judul: "Elektrometer",
  modeBaris: "tetap",
  tanpaEvaluasi: true,
  kolom: KOLOM_ISIAN,
  baris: [
    { key: "model", label: "Model elektrometer" },
    { key: "seri", label: "Nomor seri elektrometer" },
    { key: "terpisah", label: "Dikalibrasi terpisah dari chamber", opsi: [YA, TIDAK], awal: { nilai: TIDAK } },
    { key: "range", label: "Pengaturan range" },
    { key: "kelec", label: "Faktor kalibrasi elektrometer, k_elec (bila terpisah)", awal: { nilai: "1" } },
    { key: "lab", label: "Laboratorium kalibrasi elektrometer (bila terpisah)" },
    { key: "tglKal", label: "Tanggal kalibrasi elektrometer (bila terpisah)" },
  ],
};

const blokBacaan: Blok = {
  id: "rt-bacaan",
  judul: "Bacaan Dosimeter dan Besaran Pengaruh",
  catatan:
    "Semua bacaan diperiksa kebocorannya. Suhu T adalah suhu air phantom (TRS-398 §4.4.3.1), " +
    "bukan suhu ruangan. Bacaan polaritas berlawanan atau M₂ yang dikosongkan → faktornya dianggap 1.",
  modeBaris: "tetap",
  tanpaEvaluasi: true,
  kolom: KOLOM_ISIAN,
  baris: [
    { key: "bacaan", label: "Bacaan pada V₁ dan polaritas pengguna, M (tak terkoreksi)" },
    { key: "mu", label: "Monitor unit (MU)" },
    { key: "p", label: "Tekanan udara, P (kPa)" },
    { key: "t", label: "Suhu air phantom, T (°C)" },
    { key: "rh", label: "Kelembapan relatif (%)" },
    { key: "bacaanLawan", label: "Bacaan pada polaritas berlawanan (untuk k_pol)" },
    { key: "mPlusQ0", label: "M₊ pada Q₀ (hanya bila lab tidak mengoreksi polaritas)" },
    { key: "mMinQ0", label: "M₋ pada Q₀ (hanya bila lab tidak mengoreksi polaritas)" },
    { key: "v2", label: "Tegangan tereduksi, V₂ (V)", placeholder: "100" },
    { key: "m2", label: "Bacaan pada V₂, M₂" },
    {
      key: "jenisBerkas",
      label: "Jenis berkas untuk Tabel 10",
      opsi: [BERKAS_PULSED, BERKAS_SCANNED],
      awal: { nilai: BERKAS_PULSED },
    },
    { key: "panjangRongga", label: "Panjang rongga chamber, L (cm) — FFF; kosong = Tabel 4" },
    { key: "kvolManual", label: "k_vol dari profil terukur (opsional, FFF)" },
  ],
};

const blokFaktor: Blok = {
  id: "rt-faktor",
  judul: "Faktor Koreksi dan Bacaan Terkoreksi",
  modeBaris: "tetap",
  tanpaEvaluasi: true,
  kolom: kolomHasil(
    (key, h) => {
      switch (key) {
        case "m1":
          return h.m1 === null ? "-" : `${fmtSig(h.m1, 5)} ${satuanBacaan(h)}`;
        case "ktp":
          return fmt(h.ktp, 4);
        case "kelec":
          return fmt(h.kelec, 4);
        case "kpol":
          return fmt(h.kpol, 4);
        case "ks":
          return fmt(h.ks, 4);
        case "kvol":
          return fmt(h.kvol, 4);
        case "mq":
          return h.mq === null ? "-" : `${fmtSig(h.mq, 5)} ${satuanBacaan(h)}`;
      }
      return "-";
    },
    (key, h) => {
      switch (key) {
        case "m1":
          return "M / MU";
        case "ktp":
          return "Eq. (10), 273,15 K";
        case "kelec":
          return h.kelecTerpisah ? "Sertifikat elektrometer" : "Tidak dikalibrasi terpisah → 1";
        case "kpol":
          if (!h.kpolDiukur) return "Tidak diukur → 1";
          return h.kpolTermodifikasi
            ? `Eq. (12), [k_pol]Q₀ = ${fmt(h.kpolQ0, 4)}`
            : "Eq. (11)";
        case "ks":
          if (!h.ksDiukur) return "Tidak diukur → 1";
          return h.ksLuarTabel
            ? `V₁/V₂ = ${fmt(h.n, 2)} di luar Tabel 10 → Eq. (14)`
            : `Eq. (13), Tabel 10, V₁/V₂ = ${fmt(h.n, 2)}`;
        case "kvol":
          if (!h.fff) return "Berkas WFF → 1";
          return h.kvolManual
            ? "Dari profil terukur (Eq. 19)"
            : `Eq. (22), L = ${fmt(h.panjangCm, 2)} cm, SDD = ${fmt(h.sdd, 1)} cm`;
        case "mq":
          return "M₁·k_TP·k_elec·k_pol·k_s·k_vol";
      }
      return "";
    },
  ),
  baris: [
    { key: "m1", label: "Bacaan per MU, M₁" },
    { key: "ktp", label: "Koreksi suhu & tekanan, k_TP" },
    { key: "kelec", label: "Kalibrasi elektrometer, k_elec" },
    { key: "kpol", label: "Koreksi polaritas, k_pol" },
    { key: "ks", label: "Koreksi rekombinasi ion, k_s" },
    { key: "kvol", label: "Koreksi perata-rataan volume, k_vol" },
    { key: "mq", label: "Bacaan terkoreksi pada V₁, M_Q" },
  ],
  // Pemeriksaan chamber kelas acuan (Tabel 3) — informatif, tanpa verdict.
  ringkasanBlok: (ctx) => {
    const h = hitungTrs398(ctx.all);
    const out: RingkasanItem[] = [];
    const tanda = (ok: boolean) => (ok ? "memenuhi" : "melebihi — periksa chamber");
    if (h.kpolDiukur && h.kpol !== null) {
      const efek = Math.abs(h.kpol - 1) * 100;
      out.push({
        label: "Efek polaritas |k_pol − 1| (Tabel 3)",
        nilai: `${fmt(efek, 2)} % — ${tanda(efek < BATAS_EFEK_POLARITAS_PERSEN)}`,
        toleransi: `< ${BATAS_EFEK_POLARITAS_PERSEN} %`,
      });
    }
    if (h.ksDiukur && h.ks !== null) {
      out.push({
        label: "Koreksi rekombinasi k_s (Tabel 3)",
        nilai: `${fmt(h.ks, 4)} — ${tanda(h.ks <= BATAS_KS)}`,
        toleransi: `≤ ${BATAS_KS}`,
      });
      if (!h.ksLuarTabel && h.ksEq14 !== null && h.ks < KS_BERLAKU_PENDEKATAN) {
        const selisih = Math.abs(h.ks - h.ksEq14) / h.ks * 100;
        out.push({
          label: "Cek silang k_s: Eq. (13) terhadap Eq. (14)",
          nilai: `${fmt(selisih, 3)} % — ${
            selisih <= BATAS_SELISIH_KS_PERSEN ? "konsisten" : "tidak konsisten, periksa bacaan"
          }`,
          toleransi: `≤ ${BATAS_SELISIH_KS_PERSEN} %`,
        });
      }
    }
    return out;
  },
};

const blokDosisZref: Blok = {
  id: "rt-dosis",
  judul: "Dosis Serap Air di Kedalaman Acuan",
  modeBaris: "tetap",
  tanpaEvaluasi: true,
  kolom: kolomHasil(
    (key, h) => {
      switch (key) {
        case "kq":
          return fmt(h.kq, 4);
        case "ndw":
          return h.ndwTeks === "" ? "-" : `${h.ndwTeks} ${h.satuanNdw}`;
        case "dwZref":
          return h.dwZref === null ? "-" : `${fmtSig(h.dwZref, 4)} Gy/MU`;
      }
      return "-";
    },
    (key, h) => {
      switch (key) {
        case "kq":
          return h.sumberKq;
        case "ndw":
          return "Sertifikat kalibrasi chamber";
        case "dwZref":
          return "M_Q · N_D,w,Q₀ · k_Q,Q₀ — Eq. (33)";
      }
      return "";
    },
  ),
  baris: [
    { key: "kq", label: "Faktor kualitas berkas, k_Q,Q₀" },
    { key: "ndw", label: "Koefisien kalibrasi, N_D,w,Q₀" },
    { key: "dwZref", label: "Dosis serap air, D_w,Q(z_ref)" },
  ],
};

const blokZmax: Blok = {
  id: "rt-zmax",
  judul: "Data Kedalaman Dosis Maksimum",
  catatan:
    "Isi PDD untuk set-up SSD, atau TMR untuk set-up SAD. Batas deviasi diisi Fismed — " +
    "TRS-398 tidak menetapkan toleransi keluaran.",
  modeBaris: "tetap",
  tanpaEvaluasi: true,
  kolom: KOLOM_ISIAN,
  baris: [
    { key: "zmax", label: "Kedalaman dosis maksimum, z_max (g/cm²)" },
    { key: "pdd", label: "PDD(z_ref) lapangan 10 × 10 (%) — set-up SSD" },
    { key: "tmr", label: "TMR(z_ref) lapangan 10 × 10 — set-up SAD" },
    { key: "acuan", label: "Nilai acuan keluaran di z_max (cGy/MU)", awal: { nilai: "1.000" } },
    { key: "batas", label: "Batas deviasi keluaran (± %)", placeholder: "diisi Fismed" },
  ],
};

const blokKeluaran: Blok = {
  id: "rt-keluaran",
  judul: "Dosis Serap Air di z_max (Kalibrasi Keluaran Monitor)",
  modeBaris: "tetap",
  tanpaEvaluasi: true,
  kolom: kolomHasil(
    (key, h) => {
      switch (key) {
        case "dwZmax":
          return h.dwZmax === null ? "-" : `${fmtSig(h.dwZmax, 4)} Gy/MU`;
        case "dwZmaxCgy":
          return h.dwZmaxCgy === null ? "-" : `${fmt(h.dwZmaxCgy, 4)} cGy/MU`;
      }
      return "-";
    },
    (key, h) => {
      if (key === "dwZmax") {
        return h.setupSad ? "D_w,Q(z_ref) / TMR(z_ref)" : "100 · D_w,Q(z_ref) / PDD(z_ref)";
      }
      return "";
    },
  ),
  baris: [
    { key: "dwZmax", label: "D_w,Q(z_max)" },
    { key: "dwZmaxCgy", label: "D_w,Q(z_max)" },
  ],
  ringkasanBlok: (ctx) => {
    const h = hitungTrs398(ctx.all);
    let verdict: Verdict = "na";
    if (h.deviasi !== null && h.batas !== null) {
      verdict = Math.abs(h.deviasi) <= h.batas ? "lolos" : "tidak-lolos";
    }
    return [
      {
        label: `Deviasi keluaran terhadap nilai acuan (${fmt(h.acuan, 3)} cGy/MU)`,
        nilai: h.deviasi === null ? "-" : `${fmt(h.deviasi, 2)} %`,
        toleransi: h.batas === null ? "Batas belum diisi" : `|e| ≤ ± ${fmt(h.batas, 1)} %`,
        verdict,
      },
    ];
  },
};

/* ---------------- Template ---------------- */

export const linacFoton: Template = {
  key: "linac-foton",
  bidang: "radioterapi",
  nama: "LINAC — Dosimetri Foton (TRS-398)",
  namaAlat: "Pesawat LINAC (Berkas Foton)",
  judulLaporan: "DOSIMETRI BERKAS FOTON PESAWAT LINAC",
  metodeKerjaDefault: `${SUMBER_TRS398} — Bagian 6`,
  kodeLHU: "LHU-RT-01",
  catatanLingkup:
    `Penentuan dosis serap air di kondisi acuan untuk satu energi foton, mengikuti ${SUMBER_TRS398} ` +
    `Bagian 6. Ketidakpastian standar gabungan D_w tipikal ${KETIDAKPASTIAN_DW_PERSEN.toFixed(1)} % ` +
    "(k = 1, Tabel 17). Batas deviasi keluaran ditentukan Fismed.",
  rekomendasiDefault: REKOMENDASI_DEFAULT,

  konfigurasi: [
    {
      id: "linac",
      judul: "Data Pesawat LINAC",
      fields: [
        { key: "lin_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "lin_model", label: "Model/Tipe", jenis: "text" },
        { key: "lin_seri", label: "No. Seri", jenis: "text" },
        { key: "lin_tahun", label: "Tahun Produksi", jenis: "text" },
        { key: "lin_foton", label: "Energi Foton", jenis: "text", placeholder: "6 MV, 10 MV" },
        { key: "lin_elektron", label: "Energi Elektron", jenis: "text", placeholder: "6, 9, 12 MeV" },
        { key: "lin_fff", label: "Mode FFF", jenis: "pilihan", opsi: [YA, TIDAK] },
        { key: "lin_mlc", label: "MLC", jenis: "text", placeholder: "80 leaf" },
      ],
    },
  ],

  seksi: [
    seksiKondisiLingkungan(),
    { id: "rt-acuan", judul: "A. Unit Radiasi dan Kondisi Acuan", blok: [blokKondisiAcuan] },
    { id: "rt-dosimeter", judul: "B. Ion Chamber dan Elektrometer", blok: [blokChamber, blokElektrometer] },
    {
      id: "rt-koreksi",
      judul: "C. Bacaan Dosimeter dan Koreksi Besaran Pengaruh",
      blok: [blokBacaan, blokFaktor],
    },
    { id: "rt-zref", judul: "D. Dosis Serap Air di z_ref", blok: [blokDosisZref] },
    { id: "rt-keluaran-seksi", judul: "E. Dosis Serap Air di z_max dan Keluaran", blok: [blokZmax, blokKeluaran] },
  ],
};
