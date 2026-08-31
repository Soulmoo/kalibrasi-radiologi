/**
 * Kumpulan rumus kalkulasi kalibrasi alat radiologi.
 *
 * Sumber rumus: PRD Lampiran A (diriset dari IAEA, AAPM, NEMA, ACR, dan Perka
 * BAPETEN, lalu dicocokkan dengan 6 dokumen contoh BPAFK Surabaya).
 *
 * PERHATIAN — masih menunggu validasi Fismed (PRD Fase 0):
 * konvensi tanda kesalahan relatif di dokumen contoh TIDAK konsisten antar
 * modalitas. Dokumen C-Arm, Angiografi, dan Gigi memakai (terukur − set)/set,
 * sedangkan CT-Scan dan Radiografi Mobile menampilkan tandanya terbalik.
 * Di sini dipakai satu konvensi baku sesuai PRD Lampiran A.1.1:
 *     e = (terukur − set) / set × 100 %
 * sehingga nilai positif berarti hasil ukur LEBIH BESAR dari setting.
 */

export type Angka = number | null;

/**
 * Jumlah angka di belakang koma yang dipakai kalau sebuah parameter tidak
 * menentukan ketelitiannya sendiri.
 *
 * Ketelitian tampilan diatur per parameter, bukan disamaratakan: kolom hitung
 * memakai properti `desimal` di definisi templatenya, dan hasil hitung tingkat
 * blok memanggil `fmt(nilai, n)` dengan n-nya sendiri. Alasannya, tiap
 * parameter punya ketelitian yang lazim berbeda di dokumen BPAFK — kesalahan
 * relatif ditulis 1 desimal (3.5 %), keluaran radiasi 4 desimal
 * (0.0260 mGy/mAs), sedangkan koefisien seperti CV dan GR butuh 3 desimal
 * supaya tidak membulat menjadi 0.00 terhadap batasnya.
 */
export const DESIMAL_TAMPILAN = 2;

/** Ubah nilai form (string) menjadi angka; string kosong / "-" -> null. */
export function num(v: unknown): Angka {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(",", ".");
  if (s === "" || s === "-" || s.toUpperCase() === "NA") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Kumpulkan beberapa nilai jadi array angka valid saja. */
export function angkaValid(values: unknown[]): number[] {
  return values.map(num).filter((v): v is number => v !== null);
}

/** Kesalahan relatif dalam persen. PRD A.1.1 / A.1.2 */
export function kesalahanRelatif(terukur: Angka, set: Angka): Angka {
  if (terukur === null || set === null || set === 0) return null;
  return ((terukur - set) / set) * 100;
}

/** Deviasi persen terhadap nilai acuan (mis. CTDIvol console). PRD A.2.1 */
export function deviasiPersen(terukur: Angka, acuan: Angka): Angka {
  if (terukur === null || acuan === null || acuan === 0) return null;
  return ((terukur - acuan) / acuan) * 100;
}

/** Koefisien linier CL = |X2 − X1| / (X2 + X1). PRD A.1.3 */
export function koefisienLinier(values: unknown[]): Angka {
  const v = angkaValid(values);
  if (v.length < 2) return null;
  const max = Math.max(...v);
  const min = Math.min(...v);
  if (max + min === 0) return null;
  return Math.abs(max - min) / (max + min);
}

/** Koefisien variansi CV = (Xmax − Xmin) / (Xmax + Xmin). PRD A.1.4 */
export function koefisienVariansi(values: unknown[]): Angka {
  return koefisienLinier(values);
}

/** Rata-rata aritmatik. */
export function rerata(values: unknown[]): Angka {
  const v = angkaValid(values);
  if (v.length === 0) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

/** Simpangan baku sampel (dipakai untuk noise ROI CT). */
export function simpanganBaku(values: unknown[]): Angka {
  const v = angkaValid(values);
  if (v.length < 2) return null;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const varr = v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1);
  return Math.sqrt(varr);
}

/** Keluaran radiasi ternormalisasi (mGy/mAs). */
export function perMas(dosis: Angka, mas: Angka): Angka {
  if (dosis === null || mas === null || mas === 0) return null;
  return dosis / mas;
}

/** Keluaran radiasi per 100 mAs (dipakai CT-Scan). */
export function per100mAs(dosis: Angka, mas: Angka): Angka {
  const v = perMas(dosis, mas);
  return v === null ? null : v * 100;
}

/** CTDIw = 1/3 CTDI pusat + 2/3 rerata CTDI tepi. PRD A.2.1 */
export function ctdiW(pusat: Angka, tepi: unknown[]): Angka {
  const t = rerata(tepi);
  if (pusat === null || t === null) return null;
  return (1 / 3) * pusat + (2 / 3) * t;
}

/** CTDIvol = CTDIw / pitch. PRD A.2.1 */
export function ctdiVol(ctdiw: Angka, pitch: Angka): Angka {
  if (ctdiw === null || pitch === null || pitch === 0) return null;
  return ctdiw / pitch;
}

/** Selisih lapangan kolimasi dinyatakan dalam % SID. */
export function persenSID(selisihCm: Angka, sidCm: Angka): Angka {
  if (selisihCm === null || sidCm === null || sidCm === 0) return null;
  return (selisihCm / sidCm) * 100;
}

/**
 * Tabel HVL minimum (mmAl) menurut tegangan tabung, mengacu Perka BAPETEN
 * No. 2/2018 untuk radiografi umum & dental. Dipakai sebagai NILAI AWAL yang
 * tetap bisa diubah manual oleh Fismed di form (CT-Scan memakai tabel berbeda).
 */
const TABEL_HVL: Array<[number, number]> = [
  [50, 1.5],
  [60, 1.8],
  [70, 2.1],
  [80, 2.3],
  [90, 2.5],
  [100, 2.7],
  [110, 3.0],
  [120, 3.2],
  [130, 3.5],
  [140, 3.8],
  [150, 4.1],
];

/** HVL minimum untuk kVp tertentu (interpolasi linier antar titik tabel). */
export function hvlMinimum(kvp: Angka): Angka {
  if (kvp === null) return null;
  if (kvp <= TABEL_HVL[0][0]) return TABEL_HVL[0][1];
  const akhir = TABEL_HVL[TABEL_HVL.length - 1];
  if (kvp >= akhir[0]) return akhir[1];
  for (let i = 0; i < TABEL_HVL.length - 1; i++) {
    const [k1, h1] = TABEL_HVL[i];
    const [k2, h2] = TABEL_HVL[i + 1];
    if (kvp >= k1 && kvp <= k2) {
      const t = (kvp - k1) / (k2 - k1);
      return Math.round((h1 + t * (h2 - h1)) * 100) / 100;
    }
  }
  return null;
}

/* ---------------- Fluoroskopi (Angiografi & C-Arm) ---------------- */

/**
 * Selisih dua diameter/lapangan dinyatakan sebagai persentase SID.
 * Dipakai untuk kolimasi berkas terhadap permukaan II dan kesesuaian lapangan
 * berkas dengan display monitor. PRD A.3.1
 */
export function selisihPersenSID(a: Angka, b: Angka, sid: Angka): Angka {
  if (a === null || b === null || sid === null || sid === 0) return null;
  return ((a - b) / sid) * 100;
}

/* ---------------- MRI (mengacu NEMA MS 1 & ACR MRI QC Manual) ---------------- */

/**
 * Faktor koreksi derau latar NEMA MS 1 metode single-image: derau pada citra
 * magnitudo mengikuti sebaran Rayleigh, sehingga simpangan baku ROI udara
 * dikalikan 0.655 sebelum dipakai sebagai penyebut SNR.
 *
 * Faktor ini disimpulkan dari dokumen contoh MRI: SNR 374.02 pada sinyal
 * 1664.82 dan derau 2.92 (rasio mentah 570.14) memberi faktor 0.656; pasangan
 * T2 pada dokumen yang sama memberi 0.655. Perlu dikonfirmasi ke MK-PRUK-10.
 */
export const FAKTOR_DERAU_NEMA = 0.655;

/** SNR = 0.655 × (sinyal rerata fantom / simpangan baku derau). PRD A.5.3 */
export function snr(sinyal: Angka, derau: Angka): Angka {
  if (sinyal === null || derau === null || derau === 0) return null;
  return FAKTOR_DERAU_NEMA * (sinyal / derau);
}

/** SNR ternormalisasi = SNR / tebal irisan. PRD A.5.3 */
export function snrTernormalisasi(nilaiSnr: Angka, tebalIrisan: Angka): Angka {
  if (nilaiSnr === null || tebalIrisan === null || tebalIrisan === 0) return null;
  return nilaiSnr / tebalIrisan;
}

/** PIU (%) = 100 × [1 − (Smaks − Smin) / (Smaks + Smin)]. PRD A.5.4 */
export function keseragamanCitra(maks: Angka, min: Angka): Angka {
  if (maks === null || min === null || maks + min === 0) return null;
  return 100 * (1 - (maks - min) / (maks + min));
}

/** Akurasi geometrik (%) = |terukur − sebenarnya| / sebenarnya × 100. PRD A.5.1 */
export function akurasiGeometrik(terukur: Angka, sebenarnya: Angka): Angka {
  if (terukur === null || sebenarnya === null || sebenarnya === 0) return null;
  return (Math.abs(terukur - sebenarnya) / sebenarnya) * 100;
}

/** Akurasi posisi irisan = rerata pergeseran bar-ramp kiri & kanan. PRD A.5.6 */
export function akurasiPosisiIrisan(kiri: Angka, kanan: Angka): Angka {
  if (kiri === null || kanan === null) return null;
  return (Math.abs(kiri) + Math.abs(kanan)) / 2;
}

/** Tebal irisan ACR = 0.2 × (bawah × atas) / (bawah + atas). PRD A.5.7 */
export function tebalIrisanACR(bawah: Angka, atas: Angka): Angka {
  if (bawah === null || atas === null || bawah + atas === 0) return null;
  return 0.2 * ((bawah * atas) / (bawah + atas));
}

/**
 * Percent signal ghosting.
 * GR = |(atas + bawah) − (kiri + kanan)| / (2 × sinyal ROI fantom). PRD A.5.8
 */
export function ghostingRatio(
  fantom: Angka,
  atas: Angka,
  bawah: Angka,
  kiri: Angka,
  kanan: Angka,
): Angka {
  if ([fantom, atas, bawah, kiri, kanan].some((v) => v === null)) return null;
  if (fantom === 0) return null;
  return (
    Math.abs(atas! + bawah! - (kiri! + kanan!)) / (2 * fantom!)
  );
}

/* ---------------- Audit dosis pasien (TPDI / Si-INTAN) ---------------- */

/**
 * Median (persentil ke-50 / Q2) — inilah "nilai tipikal dosis" pada Pedoman
 * Teknis TPDI butir 1.5.21: nilai dosis suatu fasilitas untuk satu jenis
 * pemeriksaan dalam satu kelompok umur pada satu modalitas.
 */
export function median(values: unknown[]): Angka {
  return persentil(values, 50);
}

/**
 * Persentil dengan interpolasi linier antar dua data terdekat.
 *
 * Dipakai untuk Q3 = TPD Lokal (butir 1.5.20) dan Q3 dari sebaran nilai tipikal
 * = TPD Nasional (butir 1.5.19).
 *
 * ASUMSI: pedoman menyebut "persentil ke-75" tanpa menetapkan metode
 * interpolasinya, padahal hasilnya bisa berbeda antar metode pada sampel kecil.
 * Di sini dipakai interpolasi linier pada posisi (n−1)·p/100 — metode yang sama
 * dengan PERCENTILE.INC di Excel, yang paling lazim dipakai fasilitas saat
 * menghitung manual. Kalau BAPETEN kelak menetapkan metode lain, hanya fungsi
 * ini yang perlu diubah.
 */
export function persentil(values: unknown[], p: number): Angka {
  const v = angkaValid(values).sort((a, b) => a - b);
  if (v.length === 0) return null;
  if (v.length === 1) return v[0];

  const pos = ((v.length - 1) * p) / 100;
  const bawah = Math.floor(pos);
  const atas = Math.ceil(pos);
  if (bawah === atas) return v[bawah];
  return v[bawah] + (pos - bawah) * (v[atas] - v[bawah]);
}

/** Hasil regresi keluaran tabung terhadap tegangan: Y = a · kV^n. */
export type RegresiKeluaran = { a: number; n: number; r2: number; titik: number };

/**
 * Regresi pangkat keluaran radiasi terhadap tegangan tabung, Y = a · kV^n.
 *
 * Dipakai untuk Jalur B audit dosis (Pedoman Teknis butir 3.2.4.1.2): kalau
 * pesawat tidak punya indikator dosis, INAK diperkirakan dari data keluaran
 * radiasi hasil uji kesesuaian. Karena kV klinis pasien jarang persis sama
 * dengan kV yang diuji, keluaran pada kV klinis diperoleh lewat regresi ini.
 *
 * Bentuk pangkat dipilih mengikuti literatur Si-INTAN, yang melaporkan
 * persamaan seperti Y = 2×10⁻⁷ · kV^2,6937. Regresinya dikerjakan sebagai
 * kuadrat terkecil linier pada skala log-log: ln Y = ln a + n · ln kV.
 *
 * Butuh minimal dua titik dengan kV BERBEDA; titik dengan kV atau keluaran
 * ≤ 0 dibuang karena logaritmanya tidak terdefinisi.
 */
export function regresiPangkat(
  titik: Array<{ kv: Angka; y: Angka }>,
): RegresiKeluaran | null {
  const t = titik
    .filter((p) => p.kv !== null && p.y !== null && p.kv > 0 && p.y > 0)
    .map((p) => ({ x: Math.log(p.kv as number), y: Math.log(p.y as number) }));

  if (t.length < 2) return null;
  // Semua kV sama -> kemiringan tidak bisa ditentukan.
  if (new Set(t.map((p) => p.x)).size < 2) return null;

  const n = t.length;
  const mx = t.reduce((a, p) => a + p.x, 0) / n;
  const my = t.reduce((a, p) => a + p.y, 0) / n;

  let sxy = 0;
  let sxx = 0;
  for (const p of t) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
  }
  if (sxx === 0) return null;

  const kemiringan = sxy / sxx;
  const potong = my - kemiringan * mx;

  let ssRes = 0;
  let ssTot = 0;
  for (const p of t) {
    ssRes += (p.y - (potong + kemiringan * p.x)) ** 2;
    ssTot += (p.y - my) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { a: Math.exp(potong), n: kemiringan, r2, titik: n };
}

/** Keluaran tabung (mGy/mAs) pada tegangan tertentu menurut hasil regresi. */
export function keluaranPadaKv(reg: RegresiKeluaran | null, kv: Angka): Angka {
  if (!reg || kv === null || kv <= 0) return null;
  const y = reg.a * kv ** reg.n;
  return Number.isFinite(y) ? y : null;
}

/**
 * INAK = Y(kV) × mAs × (jarakUkur / FSD)².
 *
 * `jarakUkur` adalah jarak saat keluaran radiasi diukur — Si-INTAN memakai
 * 100 cm sebagai jarak baku. PERHATIAN: pembilangnya adalah jarak PENGUKURAN,
 * bukan FDD klinis; keduanya sering berbeda (mis. output diukur pada 100 cm
 * sementara Chest PA dieksposi pada 180 cm).
 *
 * Karena hubungannya kuadrat terbalik, galat FSD terkuadratkan: meleset 10 cm
 * pada FSD 70 cm sudah menggeser INAK sekitar 25 %.
 */
export function hitungInak(
  keluaran: Angka,
  mas: Angka,
  jarakUkur: Angka,
  fsd: Angka,
): Angka {
  if (keluaran === null || mas === null || jarakUkur === null || fsd === null) return null;
  if (fsd <= 0 || jarakUkur <= 0) return null;
  return keluaran * mas * (jarakUkur / fsd) ** 2;
}

/**
 * Faktor hamburan balik (Back Scatter Factor) untuk radiografi umum.
 *
 * Si-INTAN memakai nilai tetap 1,35: ESAK = 1,35 × INAK. Ini penyederhanaan
 * resmi — BSF sebenarnya bergantung pada kualitas berkas (kVp, HVL), luas
 * lapangan, dan ketebalan pasien, dengan rentang lazim 1,25–1,6. Nilai tetap
 * dipakai supaya hasil antar fasilitas bisa dibandingkan.
 *
 * BSF selalu > 1: hamburan balik MENAMBAH kerma di permukaan kulit, sehingga
 * ESAK selalu lebih besar dari INAK.
 */
export const BSF_RADIOGRAFI_UMUM = 1.35;

/** Jarak baku pengukuran keluaran radiasi menurut definisi INAK di Si-INTAN. */
export const JARAK_UKUR_BAKU_CM = 100;

/** ESAK = INAK × BSF. */
export function hitungEsak(inak: Angka, bsf: Angka = BSF_RADIOGRAFI_UMUM): Angka {
  if (inak === null || bsf === null) return null;
  return inak * bsf;
}

/**
 * FSD diturunkan dari geometri: jarak fokus ke permukaan meja dikurangi tebal
 * pasien. Dipakai kalau FSD tidak diukur langsung saat eksposi.
 */
export function fsdDariTebal(jarakFokusMeja: Angka, tebalPasien: Angka): Angka {
  if (jarakFokusMeja === null || tebalPasien === null) return null;
  const fsd = jarakFokusMeja - tebalPasien;
  return fsd > 0 ? fsd : null;
}

/** Format angka untuk tampilan/PDF. Nilai null ditulis "-" seperti dokumen contoh. */
export function fmt(v: Angka | undefined, desimal = DESIMAL_TAMPILAN): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "-";
  return v.toFixed(desimal);
}

/** Format persen. */
export function fmtPersen(v: Angka | undefined, desimal = DESIMAL_TAMPILAN): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "-";
  return `${v.toFixed(desimal)}%`;
}
