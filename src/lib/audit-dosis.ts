/**
 * Mesin hitung audit dosis pasien terhadap TPDI.
 *
 * Perannya sejajar src/lib/evaluasi.ts untuk laporan kalibrasi: mengambil data
 * mentah yang diketik Fismed lalu menghasilkan nilai terhitung. Tidak ada nilai
 * turunan yang disimpan — semuanya dihitung ulang tiap render.
 *
 * PERBEDAAN PENTING dari evaluasi.ts: modul ini TIDAK mengenal verdict
 * "lolos"/"tidak-lolos". TPD adalah indikator optimisasi, bukan nilai batas;
 * melampauinya memicu reviu, bukan menyatakan alat gagal. Pedoman Teknis butir
 * 3.3 bahkan mewajibkan reviu untuk KETIGA situasi, termasuk saat dosis lebih
 * rendah dari TPD nasional (dosis terlalu rendah berisiko mutu citra buruk dan
 * pengulangan pencitraan).
 */

import { rute } from "@/lib/bidang";
import type { Angka } from "@/lib/calc";
import {
  BSF_RADIOGRAFI_UMUM,
  JARAK_UKUR_BAKU_CM,
  type RegresiKeluaran,
  fsdDariTebal,
  hitungEsak,
  hitungInak,
  keluaranPadaKv,
  median,
  num,
  perMas,
  persentil,
} from "@/lib/calc";
import {
  type KelompokUsia,
  type ModalitasAudit,
  tpdiPembanding,
  tpdiPembandingSekunder,
} from "@/lib/tpdi";

/* ---------------- Status & konstanta ---------------- */

/**
 * Audit dosis hanya ada di bidang Radiologi — TPDI adalah tingkat panduan
 * untuk radiologi diagnostik (lihat BIDANG di src/lib/bidang.ts). Semua link
 * dan redirect audit dosis dibangun dari konstanta ini.
 */
export const RUTE_AUDIT = rute("radiologi", "/audit-dosis");

export const STATUS_DRAF = "draft";
export const STATUS_PERMANEN = "selesai";

/** Audit yang sudah dikunci: tidak bisa disunting lagi oleh siapa pun. */
export function terkunciAudit(status: string): boolean {
  return status === STATUS_PERMANEN;
}

export function labelStatusAudit(status: string): string {
  return terkunciAudit(status) ? "Tersimpan permanen" : "Draf";
}

export const PESAN_AUDIT_TERKUNCI =
  "Audit ini sudah disimpan permanen dan tidak dapat diubah lagi.";

/**
 * Jumlah data minimum per jenis pemeriksaan per kelompok umur agar sebuah grup
 * memenuhi syarat survei TPD (Pedoman Teknis butir 1.5.17).
 */
export const MIN_PASIEN = 20;

export type MetodeAudit = "indikator" | "estimasi";

export function labelMetode(m: string): string {
  return m === "estimasi"
    ? "Estimasi dari keluaran radiasi (Jalur B)"
    : "Indikator dosis pesawat (Jalur A)";
}

/* ---------------- Bentuk data ---------------- */

/** Satu baris pasien. Semua sel string, seperti Laporan.hasilUji. */
export type BarisPasien = Record<string, string> & { _key: string };

export type ParameterAudit = {
  /** hasil regresi keluaran tabung yang dibekukan saat audit dibuat (Jalur B) */
  regresi?: RegresiKeluaran | null;
  /** jarak saat keluaran radiasi diukur, cm */
  jarakUkur?: number;
  /** faktor hamburan balik */
  bsf?: number;
  /** jarak fokus ke permukaan meja, cm — untuk menurunkan FSD dari tebal pasien */
  jarakFokusMeja?: number;
};

export function parameterDefault(): ParameterAudit {
  return {
    regresi: null,
    jarakUkur: JARAK_UKUR_BAKU_CM,
    bsf: BSF_RADIOGRAFI_UMUM,
  };
}

export function barisPasienBaru(key: string): BarisPasien {
  return {
    _key: key,
    kodePasien: "",
    nama: "",
    jenisKelamin: "",
    umur: "",
    beratBadan: "",
    jenisPemeriksaan: "",
    dosisIndikator: "",
    dlp: "",
    kv: "",
    mas: "",
    fsd: "",
    tebalPasien: "",
    luasLapangan: "",
  };
}

/* ---------------- Pemetaan modalitas ---------------- */

/**
 * Terjemahkan kunci template modalitas (AlatRadiologi.jenisAlat) ke kunci tabel
 * TPDI. Keduanya berbeda ruang lingkup: template mencakup enam modalitas
 * kalibrasi, sedangkan Kepka 1211/K/V/2021 baru menetapkan TPDI untuk
 * radiografi umum dan CT-Scan.
 *
 * Modalitas lain mengembalikan null — gigi dan fluoroskopi memang sudah punya
 * TPDI (Kepka 3426/K/XI/2022 dan 1322/2024), tapi besaran dosisnya berbeda
 * (DAP, kerma total) sehingga butuh tabel dan kolom formnya sendiri.
 */
export function modalitasAuditDariJenisAlat(jenisAlat: string): ModalitasAudit | null {
  if (jenisAlat === "radiografi-mobile") return "radiografi-umum";
  if (jenisAlat === "ct-scan") return "ct-scan";
  return null;
}

/** Apakah modalitas alat ini sudah bisa diaudit dosisnya. */
export function bisaDiauditDosis(jenisAlat: string): boolean {
  return modalitasAuditDariJenisAlat(jenisAlat) !== null;
}

/* ---------------- Sumber keluaran radiasi (Jalur B) ---------------- */

/**
 * Blok uji kesesuaian yang menyimpan data keluaran radiasi per tegangan.
 *
 * Blok `akurasi-tegangan` pada template radiografi mobile/umum sudah merekam
 * dosis (mGy) untuk beberapa setting kVp pada mA dan s yang tetap — persis
 * bentuk "data keluaran radiasi hasil uji kesesuaian" yang dipakai Pedoman
 * Teknis butir 3.2.4.1.2. Jadi audit dosis tinggal membacanya, tidak perlu
 * blok pengukuran baru.
 */
export const BLOK_KELUARAN = "akurasi-tegangan";

export type TitikKeluaran = { kv: Angka; y: Angka };

/**
 * Ambil titik (kV, keluaran mGy/mAs) dari hasil uji sebuah laporan kalibrasi.
 *
 * mAs diambil dari meta blok (setMa × setS) karena seluruh baris blok ini
 * diukur pada mA dan s yang sama; tanpa keduanya keluaran tidak bisa
 * dinormalisasi per mAs dan regresi tidak bisa dipakai untuk menghitung INAK.
 *
 * Regresi memakai kVp SETTING, bukan kVp terukur: saat audit, yang tercatat di
 * rekam pemeriksaan adalah kV yang dipilih operator. Kalau setting kosong,
 * bacaan terukur dipakai sebagai cadangan.
 */
export function titikKeluaranDariHasil(hasil: Record<string, unknown>): TitikKeluaran[] {
  const blok = hasil?.[BLOK_KELUARAN] as
    | { meta?: Record<string, string>; rows?: Array<Record<string, string>> }
    | undefined;
  if (!blok?.rows) return [];

  const ma = num(blok.meta?.setMa);
  const s = num(blok.meta?.setS);
  if (ma === null || s === null) return [];
  const mas = ma * s;
  if (mas <= 0) return [];

  return blok.rows
    .map((r) => ({
      kv: num(r.kvpSet) ?? num(r.kvpTerukur),
      y: perMas(num(r.dosis), mas),
    }))
    .filter((t) => t.kv !== null && t.y !== null);
}

/* ---------------- Kelompok umur ---------------- */

/**
 * Kelompok umur survei TPD (Pedoman Teknis butir 2.2.2.15): 0–4, 5–14, dan
 * 15 tahun ke atas, mengikuti mekanisme yang diterapkan di Australia.
 */
export function kelompokUmur(umur: Angka): KelompokUsia | null {
  if (umur === null || umur < 0) return null;
  if (umur < 5) return "0-4";
  if (umur < 15) return "5-14";
  return ">=15";
}

/* ---------------- Hitung per baris ---------------- */

export type HasilBaris = {
  /** jarak fokus-kulit yang dipakai, cm (Jalur B) */
  fsd: Angka;
  /** keluaran tabung pada kV baris ini, mGy/mAs (Jalur B) */
  keluaran: Angka;
  inak: Angka;
  esak: Angka;
  ctdivol: Angka;
  dlp: Angka;
  /** nilai yang dipakai untuk pembandingan TPDI utama (ESAK atau CTDIvol) */
  utama: Angka;
  /** pembanding sekunder (INAK atau DLP) */
  sekunder: Angka;
};

/**
 * Hitung satu baris pasien.
 *
 * Radiografi umum:
 * - Jalur A: pesawat menampilkan ESAK/Skin Dose. INAK diturunkan balik dari ESAK
 *   dengan membaginya BSF, supaya kedua besaran tetap tersedia untuk pembandingan.
 * - Jalur B: INAK = Y(kV) × mAs × (jarakUkur/FSD)², lalu ESAK = INAK × BSF.
 *
 * CT-Scan: CTDIvol dan DLP selalu dibaca dari konsol; tidak ada jalur estimasi
 * dari keluaran tabung untuk modalitas ini.
 */
export function hitungBarisPasien(
  baris: BarisPasien,
  modalitas: ModalitasAudit,
  metode: MetodeAudit,
  param: ParameterAudit,
): HasilBaris {
  const kosong: HasilBaris = {
    fsd: null,
    keluaran: null,
    inak: null,
    esak: null,
    ctdivol: null,
    dlp: null,
    utama: null,
    sekunder: null,
  };

  if (modalitas === "ct-scan") {
    const ctdivol = num(baris.dosisIndikator);
    const dlp = num(baris.dlp);
    return { ...kosong, ctdivol, dlp, utama: ctdivol, sekunder: dlp };
  }

  const bsf = param.bsf ?? BSF_RADIOGRAFI_UMUM;

  if (metode === "indikator") {
    const esak = num(baris.dosisIndikator);
    const inak = esak === null || bsf === 0 ? null : esak / bsf;
    return { ...kosong, inak, esak, utama: esak, sekunder: inak };
  }

  // Jalur B — estimasi dari keluaran radiasi.
  const fsd = num(baris.fsd) ?? fsdDariTebal(num(param.jarakFokusMeja), num(baris.tebalPasien));
  const keluaran = keluaranPadaKv(param.regresi ?? null, num(baris.kv));
  const inak = hitungInak(keluaran, num(baris.mas), num(param.jarakUkur ?? JARAK_UKUR_BAKU_CM), fsd);
  const esak = hitungEsak(inak, bsf);

  return { ...kosong, fsd, keluaran, inak, esak, utama: esak, sekunder: inak };
}

/* ---------------- Pengelompokan & pembandingan ---------------- */

export type Situasi = "lebih-tinggi" | "lebih-rendah" | "hampir-sama";

/**
 * Ambang untuk menyebut nilai tipikal "hampir sama" dengan TPD nasional.
 *
 * ASUMSI TAMPILAN: Pedoman Teknis butir 3.3.1 hanya menggambarkan tiga situasi
 * lewat grafik, tanpa menetapkan angka pemisahnya. Ambang ±10 % di sini murni
 * alat bantu baca, BUKAN kriteria regulasi — dan tidak mengubah kewajiban
 * apa pun, karena ketiga situasi sama-sama wajib direviu (butir 3.3.3–3.3.5).
 */
export const AMBANG_HAMPIR_SAMA_PERSEN = 10;

export function tentukanSituasi(nilaiTipikal: Angka, tpdi: Angka): Situasi | null {
  if (nilaiTipikal === null || tpdi === null || tpdi === 0) return null;
  const selisih = ((nilaiTipikal - tpdi) / tpdi) * 100;
  if (Math.abs(selisih) <= AMBANG_HAMPIR_SAMA_PERSEN) return "hampir-sama";
  return selisih > 0 ? "lebih-tinggi" : "lebih-rendah";
}

export function labelSituasi(s: Situasi): string {
  if (s === "lebih-tinggi") return "Lebih tinggi dari TPD nasional";
  if (s === "lebih-rendah") return "Lebih rendah dari TPD nasional";
  return "Hampir sama dengan TPD nasional";
}

/**
 * Tindak lanjut yang diwajibkan pedoman untuk tiap situasi. Ketiganya wajib
 * direviu — yang berbeda hanya fokus reviunya.
 */
export function tindakLanjutSituasi(s: Situasi): string {
  if (s === "lebih-tinggi") {
    return "Reviu menyeluruh terhadap proses penyinaran, SOP, modalitas, dan SDM pelaksana (butir 3.3.3).";
  }
  if (s === "lebih-rendah") {
    return "Reviu mutu citra: pastikan citra masih memadai untuk diagnosis agar tidak terjadi pengulangan pencitraan (butir 3.3.4).";
  }
  return "Reviu untuk memastikan keberlanjutan optimisasi yang sudah berjalan (butir 3.3.5).";
}

export type GrupAudit = {
  pemeriksaan: string;
  usia: KelompokUsia;
  n: number;
  cukupSampel: boolean;
  /** median (Q2) — nilai tipikal dosis fasilitas */
  nilaiTipikal: Angka;
  /** persentil ke-75 (Q3) — TPD lokal fasilitas */
  tpdLokal: Angka;
  nilaiTipikalSekunder: Angka;
  tpdLokalSekunder: Angka;
  tpdi: { nilai: number; satuan: string; besaran: string } | null;
  tpdiSekunder: { nilai: number; satuan: string; besaran: string } | null;
  situasi: Situasi | null;
  /** simpangan nilai tipikal terhadap TPDI, % */
  selisihPersen: Angka;
};

/**
 * Kelompokkan baris pasien per jenis pemeriksaan x kelompok umur, lalu hitung
 * nilai tipikal (median) dan TPD lokal (Q3) tiap grup dan bandingkan dengan TPDI.
 *
 * Baris tanpa jenis pemeriksaan atau tanpa umur yang sah diabaikan — keduanya
 * wajib untuk pengelompokan, dan menebaknya akan memalsukan hasil.
 */
export function kelompokkanAudit(
  rows: BarisPasien[],
  modalitas: ModalitasAudit,
  metode: MetodeAudit,
  param: ParameterAudit,
): GrupAudit[] {
  const peta = new Map<string, { pemeriksaan: string; usia: KelompokUsia; utama: Angka[]; sekunder: Angka[] }>();

  for (const r of rows) {
    const pemeriksaan = (r.jenisPemeriksaan ?? "").trim();
    const usia = kelompokUmur(num(r.umur));
    if (!pemeriksaan || !usia) continue;

    const hasil = hitungBarisPasien(r, modalitas, metode, param);
    if (hasil.utama === null) continue;

    const kunci = `${pemeriksaan}|${usia}`;
    const grup = peta.get(kunci) ?? { pemeriksaan, usia, utama: [], sekunder: [] };
    grup.utama.push(hasil.utama);
    grup.sekunder.push(hasil.sekunder);
    peta.set(kunci, grup);
  }

  const hasil: GrupAudit[] = [];
  for (const g of peta.values()) {
    const nilaiTipikal = median(g.utama);
    const tpdi = tpdiPembanding(modalitas, g.pemeriksaan, g.usia);
    const tpdiSekunder = tpdiPembandingSekunder(modalitas, g.pemeriksaan, g.usia);

    hasil.push({
      pemeriksaan: g.pemeriksaan,
      usia: g.usia,
      n: g.utama.length,
      cukupSampel: g.utama.length >= MIN_PASIEN,
      nilaiTipikal,
      tpdLokal: persentil(g.utama, 75),
      nilaiTipikalSekunder: median(g.sekunder),
      tpdLokalSekunder: persentil(g.sekunder, 75),
      tpdi,
      tpdiSekunder,
      situasi: tentukanSituasi(nilaiTipikal, tpdi?.nilai ?? null),
      selisihPersen:
        nilaiTipikal === null || !tpdi || tpdi.nilai === 0
          ? null
          : ((nilaiTipikal - tpdi.nilai) / tpdi.nilai) * 100,
    });
  }

  return hasil.sort(
    (a, b) => a.pemeriksaan.localeCompare(b.pemeriksaan) || a.usia.localeCompare(b.usia),
  );
}

export type RekapAudit = {
  totalPasien: number;
  totalGrup: number;
  grupCukup: number;
  lebihTinggi: number;
};

export function rekapAudit(grup: GrupAudit[], rows: BarisPasien[]): RekapAudit {
  return {
    totalPasien: rows.filter((r) => (r.jenisPemeriksaan ?? "").trim() !== "").length,
    totalGrup: grup.length,
    grupCukup: grup.filter((g) => g.cukupSampel).length,
    lebihTinggi: grup.filter((g) => g.situasi === "lebih-tinggi").length,
  };
}
