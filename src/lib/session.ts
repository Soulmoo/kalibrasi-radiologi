import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Satu permintaan halaman = satu kali baca sesi.
 *
 * `auth()` bukan pembacaan cookie yang murah: callback `jwt` di `src/auth.ts`
 * menyegarkan profil dan peran dari database setiap kali dipanggil. Padahal
 * tiap halaman di grup `(app)` membaca sesi dua kali — sekali di
 * `(app)/layout.tsx`, sekali lagi di `page.tsx`-nya sendiri (lihat catatan
 * "Routing, auth gating" di CLAUDE.md: tidak ada middleware, jadi keduanya
 * memang harus memanggil sendiri). Tanpa `cache()` itu berarti dua query
 * bolak-balik ke Neon sebelum satu baris datanya pun diambil.
 *
 * `cache()` React hanya berlaku di dalam satu permintaan, jadi ini tidak
 * menyimpan sesi lintas pengguna atau lintas navigasi — pola penjagaan
 * berlapisnya tetap utuh, hanya query gandanya yang hilang.
 */
const bacaSesi = cache(() => auth());

/** Ambil sesi Fismed yang login; lempar ke halaman masuk kalau belum login. */
export async function requireUser() {
  const sesi = await bacaSesi();
  if (!sesi?.user?.id) redirect("/masuk");
  return sesi.user;
}

export async function getUser() {
  const sesi = await bacaSesi();
  return sesi?.user ?? null;
}
