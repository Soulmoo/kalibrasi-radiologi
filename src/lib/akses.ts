import { notFound } from "next/navigation";

/**
 * Aturan kepemilikan data.
 *
 * Tiga hal yang sengaja dipisah:
 *
 * 1. **Daftar** (dashboard, riwayat laporan, data master) selalu menampilkan
 *    milik sendiri saja — termasuk untuk admin. Ruang kerja tiap Fismed tetap
 *    bersih dan tidak tercampur data orang lain.
 * 2. **Membuka satu data** — admin & master boleh membuka data milik Fismed
 *    lain. Pintu masuknya lewat Profil → Fismed, bukan lewat daftar miliknya
 *    sendiri.
 * 3. **Mengubah satu data** — HANYA pemiliknya. Admin dan master pun tidak.
 *    Akses lintas Fismed bersifat baca-saja.
 *
 * Kolom kepemilikannya: `createdById` untuk data master, `userId` untuk laporan.
 */

export type Pengguna = {
  id: string;
  /** admin atau master — boleh membuka data Fismed lain */
  admin: boolean;
  /** master — boleh mengatur peran & menghapus akun */
  master: boolean;
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

/** Apakah data ini miliknya sendiri. */
export function milikSendiri(user: Pengguna, pemilikId: string | null | undefined) {
  return pemilikId != null && pemilikId === user.id;
}

/**
 * Apakah pengguna boleh MEMBUKA satu data dengan pemilik tertentu.
 * Admin & master boleh atas data siapa pun.
 */
export function bolehLihat(user: Pengguna, pemilikId: string | null | undefined) {
  return user.admin || milikSendiri(user, pemilikId);
}

/**
 * Apakah pengguna boleh MENGUBAH atau MENGHAPUS satu data — hanya pemiliknya,
 * admin dan master sekalipun tidak.
 *
 * Isi laporan adalah hasil pengukuran yang sangat personal bagi Fismed yang
 * mengerjakannya: angka bacaan alat, kondisi lingkungan saat uji, dan catatan
 * lapangannya. Orang lain tidak punya dasar untuk mengubahnya, jadi akses
 * lintas Fismed sengaja dibuat baca-saja.
 */
export function bolehUbah(user: Pengguna, pemilikId: string | null | undefined) {
  return milikSendiri(user, pemilikId);
}

/**
 * Hentikan permintaan dengan 404 kalau data tidak boleh dibuka.
 *
 * Sengaja 404, bukan 403, supaya keberadaan data milik orang lain tidak bocor
 * lewat perbedaan pesan error.
 */
export function pastikanBolehLihat(user: Pengguna, pemilikId: string | null | undefined) {
  if (!bolehLihat(user, pemilikId)) notFound();
}

/**
 * Hentikan permintaan dengan 404 kalau data tidak boleh diubah. Dipakai halaman
 * yang isinya memang form sunting — buat admin, data Fismed lain di halaman
 * seperti itu diperlakukan seolah tidak ada.
 */
export function pastikanBolehUbah(user: Pengguna, pemilikId: string | null | undefined) {
  if (!bolehUbah(user, pemilikId)) notFound();
}

/** Halaman khusus admin & master — selainnya diperlakukan seolah tidak ada. */
export function pastikanAdmin(user: Pengguna) {
  if (!user.admin) notFound();
}

/** Halaman/aksi khusus master, mis. mengatur peran dan menghapus akun. */
export function pastikanMaster(user: Pengguna) {
  if (!user.master) notFound();
}
