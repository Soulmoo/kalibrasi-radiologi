import { notFound } from "next/navigation";

/**
 * Aturan kepemilikan data.
 *
 * Setiap Fismed hanya melihat dan mengubah data yang dia buat sendiri —
 * instansi, alat radiologi, alat ukur, dan laporan. Akun master (lihat
 * ADMIN_EMAILS di src/auth.ts) melihat dan bisa mengubah data milik semua
 * Fismed.
 *
 * Kolom kepemiliknya sudah ada di skema sejak awal: `createdById` untuk data
 * master, dan `userId` untuk laporan.
 */

export type Pengguna = {
  id: string;
  admin: boolean;
};

/** Filter Prisma untuk data master (instansi, alat radiologi, alat ukur). */
export function filterMilik(user: Pengguna) {
  return user.admin ? {} : { createdById: user.id };
}

/** Filter Prisma untuk laporan. */
export function filterLaporan(user: Pengguna) {
  return user.admin ? {} : { userId: user.id };
}

/** Apakah pengguna boleh membuka/mengubah data dengan pemilik tertentu. */
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
