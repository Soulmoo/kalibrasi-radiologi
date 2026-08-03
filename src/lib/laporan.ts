/**
 * Status laporan dan aturan penguncian.
 *
 * Hanya ada dua keadaan. `draft` masih bisa disunting sepuasnya; `selesai`
 * berarti laporan sudah **disimpan permanen** — ditandatangani dan dikunci.
 *
 * Kenapa dikunci: isi laporan adalah hasil pengukuran yang sudah
 * ditandatangani Fismed. Kalau angkanya masih bisa disunting sesudah laporan
 * terbit, tanda tangan itu tidak menjamin apa pun. Jadi begitu disimpan
 * permanen, laporan tidak bisa diubah lagi oleh siapa pun, termasuk pemiliknya
 * sendiri maupun master.
 *
 * Nilai kolomnya tetap "draft"/"selesai" seperti sejak awal — yang berubah
 * cuma maknanya dan labelnya di layar, jadi tidak ada migrasi data.
 */

export const STATUS_DRAF = "draft";
export const STATUS_PERMANEN = "selesai";

/** Laporan yang sudah disimpan permanen: tidak bisa disunting lagi. */
export function terkunci(status: string): boolean {
  return status === STATUS_PERMANEN;
}

export function labelStatus(status: string): string {
  return terkunci(status) ? "Tersimpan permanen" : "Draf";
}

/**
 * Ditolaknya simpan permanen tanpa tanda tangan bukan sekadar cerewet:
 * laporan yang terlanjur terkunci tanpa tanda tangan TIDAK BISA
 * ditandatangani lagi selamanya, karena menyuntingnya sudah tidak mungkin.
 */
export const PESAN_BUTUH_TTD =
  "Pasang tanda tangan di halaman Profil dulu. Laporan yang disimpan permanen tidak bisa diubah lagi, jadi tanda tangannya tidak akan bisa ditambahkan belakangan.";

export const PESAN_TERKUNCI =
  "Laporan ini sudah disimpan permanen dan tidak dapat diubah lagi.";
