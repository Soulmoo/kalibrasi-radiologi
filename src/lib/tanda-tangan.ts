/**
 * Aturan gambar tanda tangan Fismed.
 *
 * Tanda tangan disimpan sebagai data URL (base64) di kolom
 * `User.tandaTanganGambar`, lalu dibekukan ke `Laporan.tandaTanganSnapshot`
 * saat laporan ditandai selesai. Ini tanda tangan elektronik TIDAK
 * tersertifikasi — sesuai status dokumen laporan kerja internal, bukan
 * sertifikat resmi berlegalitas BAPETEN/BPAFK.
 *
 * Berkas ini dipakai KEDUA sisi: komponen di browser memakainya untuk memberi
 * pesan lebih awal, server memakainya sebagai penjaga yang sebenarnya.
 */

/**
 * Batas panjang string data URL. 200.000 karakter base64 ≈ 150 KB gambar —
 * jauh di atas kebutuhan tanda tangan yang sudah dikecilkan ke lebar
 * LEBAR_TTD_MAKS, tapi tetap menahan orang mengunggah foto kamera 8 MP mentah
 * ke dalam satu baris database.
 */
export const MAKS_TTD_CHAR = 200_000;

/** Lebar maksimum hasil pengecilan di browser sebelum dikirim ke server. */
export const LEBAR_TTD_MAKS = 600;

/** Nilai sentinel field form: kosongkan tanda tangan yang tersimpan. */
export const TTD_HAPUS = "hapus";

/**
 * Hanya PNG dan JPEG, dan sengaja whitelist — bukan blacklist.
 *
 * Nilainya dikirim klien sebagai field form biasa lalu dirender jadi
 * `<img src={...}>` di lembar cetak, jadi tanpa penjagaan ini isinya bisa
 * apa saja: `data:image/svg+xml` (SVG bisa memuat skrip), skema `javascript:`,
 * atau data URL bertipe teks. Pola di bawah menutup semuanya sekaligus.
 */
const POLA_TTD = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;

export function tandaTanganValid(nilai: string): boolean {
  if (nilai.length > MAKS_TTD_CHAR) return false;
  return POLA_TTD.test(nilai);
}

/** Pesan tolakan berbahasa Indonesia untuk ditampilkan di form. */
export const PESAN_TTD_TIDAK_VALID =
  "Tanda tangan tidak terbaca. Pakai berkas PNG atau JPG, dan pastikan ukurannya wajar.";
