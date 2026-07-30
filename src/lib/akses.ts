import { notFound } from "next/navigation";

/**
 * Aturan kepemilikan data.
 *
 * Dua hal yang sengaja dipisah:
 *
 * 1. **Daftar** (dashboard, riwayat laporan, data master) selalu menampilkan
 *    milik sendiri saja — termasuk untuk admin. Ruang kerja tiap Fismed tetap
 *    bersih dan tidak tercampur data orang lain.
 * 2. **Akses satuan** — admin tetap boleh membuka dan mengubah satu data milik
 *    Fismed lain. Pintu masuknya lewat Profil → Fismed, bukan lewat daftar
 *    miliknya sendiri.
 *
 * Kolom kepemilikannya: `createdById` untuk data master, `userId` untuk laporan.
 */

export type Pengguna = {
  id: string;
  admin: boolean;
};

/** Filter daftar data master (instansi, alat radiologi, alat ukur) milik sendiri. */
export function filterMilik(user: Pengguna) {
  return { createdById: user.id };
}

/** Filter daftar laporan milik sendiri. */
export function filterLaporan(user: Pengguna) {
  return { userId: user.id };
}

/** Filter data master milik Fismed tertentu — hanya dipakai di halaman admin. */
export function filterMilikPengguna(penggunaId: string) {
  return { createdById: penggunaId };
}

/**
 * Apakah pengguna boleh membuka/mengubah satu data dengan pemilik tertentu.
 * Admin boleh atas data siapa pun.
 */
export function boleh(user: Pengguna, pemilikId: string | null | undefined) {
  return user.admin || (pemilikId != null && pemilikId === user.id);
}

/**
 * Hentikan permintaan dengan 404 kalau data bukan miliknya.
 *
 * Sengaja 404, bukan 403, supaya keberadaan data milik orang lain tidak bocor
 * lewat perbedaan pesan error.
 */
export function pastikanBoleh(user: Pengguna, pemilikId: string | null | undefined) {
  if (!boleh(user, pemilikId)) notFound();
}

/** Halaman khusus admin — selain admin diperlakukan seolah halamannya tidak ada. */
export function pastikanAdmin(user: Pengguna) {
  if (!user.admin) notFound();
}
