/**
 * Tiga peran akun.
 *
 *   fismed  — hanya melihat & mengubah data buatannya sendiri
 *   admin   — di atas itu: bisa membuka laporan seluruh Fismed
 *   master  — di atas itu: mengatur peran akun lain dan menghapus akun
 *
 * Peran tersimpan di kolom `User.peran`. Bedanya, peran `master` TIDAK diatur
 * dari dalam aplikasi melainkan dari environment variable MASTER_EMAILS
 * (dipisah koma) — supaya pemilik aplikasi tidak bisa diturunkan atau dihapus
 * oleh siapa pun lewat antarmuka, termasuk oleh admin.
 */

export type Peran = "fismed" | "admin" | "master";

export function labelPeran(peran: string): string {
  if (peran === "master") return "Master";
  if (peran === "admin") return "Admin";
  return "Fismed";
}

/** Peran yang boleh dipilih lewat antarmuka. "master" sengaja tidak termasuk. */
export function peranBisaDiatur(peran: string): peran is "fismed" | "admin" {
  return peran === "fismed" || peran === "admin";
}

/**
 * Daftar email master. MASTER_EMAILS adalah nama yang dipakai; ADMIN_EMAILS
 * masih dibaca sebagai nama lama agar deployment yang belum diperbarui tidak
 * kehilangan akses masternya.
 */
export function daftarMaster(): string[] {
  const nilai = process.env.MASTER_EMAILS ?? process.env.ADMIN_EMAILS ?? "";
  return nilai
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function emailMaster(email: string | null | undefined): boolean {
  if (!email) return false;
  return daftarMaster().includes(email.trim().toLowerCase());
}
