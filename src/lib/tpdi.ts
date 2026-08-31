/**
 * Tingkat Panduan Diagnostik Indonesia (TPDI / I-DRL) — nilai nasional.
 *
 * Sumber: Keputusan Kepala BAPETEN Nomor 1211/K/V/2021 tanggal 24 Mei 2021
 * tentang Penetapan Nilai Tingkat Panduan Diagnostik Indonesia untuk Modalitas
 * Sinar-X CT Scan dan Radiografi Umum.
 *
 * TPD adalah INDIKATOR OPTIMISASI, bukan nilai batas dosis dan bukan ambang
 * lolos/tidak lolos. Melampauinya tidak berarti alat rusak atau pemeriksaan
 * salah — yang diwajibkan adalah reviu (Pedoman Teknis PRK/PD/01/00/2021 butir
 * 3.3). Karena itu modul audit dosis sengaja tidak punya verdict
 * "lolos"/"tidak-lolos" di mana pun.
 *
 * PEMUTAKHIRAN: nilai 2021 di bawah ini sedang direviu BAPETEN. Kajian
 * "Analisis Urgensi Pemutakhiran TPDI 2025" mencatat tren penurunan 7–52 % pada
 * radiografi umum dan 9–44 % pada CT Scan, serta penambahan jenis pemeriksaan
 * baru dan kelompok pediatrik. Draf Keputusan Kepala BAPETEN untuk TPDI 2025
 * BELUM disahkan, jadi yang berlaku tetap angka 2021. Kalau nanti terbit,
 * ganti isi tabel ini dan perbarui `SUMBER_TPDI` — perubahan angkanya bukan
 * koreksi kesalahan, melainkan mengikuti keputusan baru.
 *
 * ICRP Publikasi 135 menganjurkan TPD direviu tiap 3–5 tahun.
 */

export const SUMBER_TPDI =
  "Keputusan Kepala BAPETEN No. 1211/K/V/2021 tanggal 24 Mei 2021";

/** Kelompok usia survei TPD (Pedoman Teknis butir 2.2.2.15, mengikuti Australia). */
export const KELOMPOK_USIA = ["0-4", "5-14", ">=15"] as const;
export type KelompokUsia = (typeof KELOMPOK_USIA)[number];

export function labelKelompokUsia(k: KelompokUsia): string {
  if (k === "0-4") return "0–4 tahun";
  if (k === "5-14") return "5–14 tahun";
  return "Dewasa (≥ 15 tahun)";
}

/**
 * Kelompok usia yang punya nilai TPDI 2021.
 *
 * Kepka 1211/K/V/2021 hanya menetapkan nilai untuk dewasa; nilai pediatrik baru
 * muncul di draf 2025 yang belum disahkan. Grup pasien anak tetap dihitung
 * nilai tipikalnya, hanya saja tidak ada pembanding nasionalnya.
 */
export const USIA_BER_TPDI: KelompokUsia = ">=15";

export type ModalitasAudit = "radiografi-umum" | "ct-scan";

export const MODALITAS_AUDIT: Array<{ key: ModalitasAudit; nama: string }> = [
  { key: "radiografi-umum", nama: "Radiografi Umum / Mobile" },
  { key: "ct-scan", nama: "CT-Scan" },
];

export function namaModalitasAudit(key: string): string {
  return MODALITAS_AUDIT.find((m) => m.key === key)?.nama ?? key;
}

/* ---------------- Radiografi Umum ---------------- */

export type EntriTpdiRadiografi = {
  pemeriksaan: string;
  /** Entrance Surface Air Kerma, mGy — sudah termasuk faktor hamburan balik */
  esak: number;
  /** Incident Air Kerma, mGy — tanpa faktor hamburan balik */
  inak: number;
};

/**
 * TPDI radiografi umum, kelompok usia Dewasa, satuan mGy.
 *
 * Urutan mengikuti dokumen aslinya (alfabetis versi dokumen), bukan diurutkan
 * ulang, supaya mudah dicocokkan baris per baris saat verifikasi.
 */
export const TPDI_RADIOGRAFI: EntriTpdiRadiografi[] = [
  { pemeriksaan: "Abdomen AP", esak: 2.0, inak: 1.4 },
  { pemeriksaan: "Ankle joint AP", esak: 0.2, inak: 0.1 },
  { pemeriksaan: "Antebrachia AP", esak: 0.1, inak: 0.1 },
  { pemeriksaan: "BNO AP", esak: 1.7, inak: 1.3 },
  { pemeriksaan: "Chest AP", esak: 0.4, inak: 0.3 },
  { pemeriksaan: "Chest PA", esak: 0.4, inak: 0.3 },
  { pemeriksaan: "Cervical LAT", esak: 1.4, inak: 1.0 },
  { pemeriksaan: "Cervical AP", esak: 0.7, inak: 0.5 },
  { pemeriksaan: "Femur AP", esak: 0.5, inak: 0.4 },
  { pemeriksaan: "Genu AP", esak: 0.4, inak: 0.3 },
  { pemeriksaan: "Genu LAT", esak: 0.4, inak: 0.3 },
  { pemeriksaan: "Lumbar Spine AP", esak: 2.0, inak: 1.4 },
  { pemeriksaan: "Lumbar Spine LAT", esak: 4.4, inak: 3.1 },
  { pemeriksaan: "Manus AP", esak: 0.2, inak: 0.1 },
  { pemeriksaan: "Pedis AP", esak: 0.2, inak: 0.2 },
  { pemeriksaan: "Pelvis AP", esak: 1.8, inak: 1.4 },
  { pemeriksaan: "Shoulder", esak: 0.4, inak: 0.3 },
  { pemeriksaan: "Skull AP", esak: 1.3, inak: 0.9 },
  { pemeriksaan: "Skull LAT", esak: 1.2, inak: 0.9 },
  { pemeriksaan: "GR-Cruris/Tibia Fibula", esak: 0.3, inak: 0.2 },
  { pemeriksaan: "Wrist joint AP", esak: 0.2, inak: 0.2 },
  { pemeriksaan: "Waters", esak: 1.7, inak: 1.2 },
];

/* ---------------- CT-Scan ---------------- */

export type EntriTpdiCt = {
  pemeriksaan: string;
  /** mGy */
  ctdivol: number;
  /** mGy.cm */
  dlp: number;
};

/**
 * TPDI CT-Scan, kelompok usia Dewasa.
 *
 * Keterangan resmi dokumen (lihat KETERANGAN_TPDI_CT): CTDIvol yang dibandingkan
 * adalah RERATA serial pemindaian tiap pasien, sedangkan DLP adalah TOTAL dari
 * serial pemindaian tiap pasien. Pada pemeriksaan dengan kontras, keduanya
 * diakumulasi dari fase pre-kontras dan post-kontras.
 */
export const TPDI_CT: EntriTpdiCt[] = [
  { pemeriksaan: "CT Abdomen Kontras", ctdivol: 20, dlp: 1360 },
  { pemeriksaan: "CT Abdomen Nonkontras", ctdivol: 17, dlp: 885 },
  { pemeriksaan: "CT Abdo Pelvis Kontras", ctdivol: 16, dlp: 1775 },
  { pemeriksaan: "CT Abdo Pelvis Nonkontras", ctdivol: 17, dlp: 885 },
  { pemeriksaan: "CT Cardiac Studies Kontras", ctdivol: 47, dlp: 1200 },
  { pemeriksaan: "CT Chest Kontras", ctdivol: 16, dlp: 810 },
  { pemeriksaan: "CT Chest Nonkontras", ctdivol: 11, dlp: 430 },
  { pemeriksaan: "CT Head Kontras", ctdivol: 60, dlp: 2500 },
  { pemeriksaan: "CT Head Nonkontras", ctdivol: 60, dlp: 1275 },
  { pemeriksaan: "CT Neck Kontras", ctdivol: 50, dlp: 2600 },
  { pemeriksaan: "CT Urologi Nonkontras", ctdivol: 17, dlp: 830 },
];

export const KETERANGAN_TPDI_CT = [
  "Nilai CTDIvol merupakan rerata dari serial pemindaian setiap pasien.",
  "Nilai DLP merupakan total nilai DLP dari serial pemindaian setiap pasien.",
];

/* ---------------- Akses gabungan ---------------- */

/** Daftar jenis pemeriksaan yang punya nilai TPDI, untuk dropdown di form. */
export function daftarPemeriksaan(modalitas: ModalitasAudit): string[] {
  return modalitas === "ct-scan"
    ? TPDI_CT.map((e) => e.pemeriksaan)
    : TPDI_RADIOGRAFI.map((e) => e.pemeriksaan);
}

export function cariTpdiRadiografi(pemeriksaan: string): EntriTpdiRadiografi | undefined {
  return TPDI_RADIOGRAFI.find((e) => e.pemeriksaan === pemeriksaan);
}

export function cariTpdiCt(pemeriksaan: string): EntriTpdiCt | undefined {
  return TPDI_CT.find((e) => e.pemeriksaan === pemeriksaan);
}

/**
 * Nilai TPDI pembanding untuk satu grup.
 *
 * Mengembalikan `null` kalau tidak ada pembandingnya — jenis pemeriksaan di luar
 * daftar Kepka, atau kelompok usia anak yang memang belum punya TPDI 2021.
 */
export function tpdiPembanding(
  modalitas: ModalitasAudit,
  pemeriksaan: string,
  usia: KelompokUsia,
): { nilai: number; satuan: string; besaran: string } | null {
  if (usia !== USIA_BER_TPDI) return null;

  if (modalitas === "ct-scan") {
    const e = cariTpdiCt(pemeriksaan);
    return e ? { nilai: e.ctdivol, satuan: "mGy", besaran: "CTDIvol" } : null;
  }
  const e = cariTpdiRadiografi(pemeriksaan);
  return e ? { nilai: e.esak, satuan: "mGy", besaran: "ESAK" } : null;
}

/** Pembanding sekunder: DLP untuk CT, INAK untuk radiografi. */
export function tpdiPembandingSekunder(
  modalitas: ModalitasAudit,
  pemeriksaan: string,
  usia: KelompokUsia,
): { nilai: number; satuan: string; besaran: string } | null {
  if (usia !== USIA_BER_TPDI) return null;

  if (modalitas === "ct-scan") {
    const e = cariTpdiCt(pemeriksaan);
    return e ? { nilai: e.dlp, satuan: "mGy.cm", besaran: "DLP" } : null;
  }
  const e = cariTpdiRadiografi(pemeriksaan);
  return e ? { nilai: e.inak, satuan: "mGy", besaran: "INAK" } : null;
}
