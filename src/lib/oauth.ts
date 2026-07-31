/**
 * Masuk dengan Google bersifat opsional.
 *
 * Kalau AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET belum diisi — misalnya di komputer
 * Fismed lain yang hanya menjalankan aplikasi ini secara lokal — providernya
 * tidak didaftarkan dan tombolnya tidak ditampilkan. Lebih baik tombolnya tidak
 * ada sama sekali daripada ada tapi menghasilkan halaman error Google.
 *
 * Nama environment variable-nya mengikuti pola bawaan Auth.js v5
 * (AUTH_<PROVIDER>_ID / _SECRET), jadi tidak perlu dioper manual ke provider.
 * Lihat node_modules/@auth/core/lib/utils/env.js.
 */
export function googleAktif(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}
