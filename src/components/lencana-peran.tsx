import { labelPeran } from "@/lib/peran";

/**
 * Lencana peran akun.
 *
 * Satu komponen dipakai bersama halaman Profil dan daftar Fismed. Sebelumnya
 * halaman Profil menentukan sendiri lencananya dari `user.admin` — padahal
 * flag itu bernilai true untuk admin MAUPUN master, sehingga akun master
 * tertulis "Admin" di sana. Menyatukannya di sini menutup kemungkinan kedua
 * tempat itu berbeda lagi.
 */

const WARNA: Record<string, string> = {
  master: "bg-[var(--brand)] text-white",
  admin: "bg-[var(--brand-soft)] text-[var(--brand)]",
  fismed: "bg-gray-100 text-gray-700",
};

export function LencanaPeran({ peran }: { peran: string }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 align-middle text-xs font-medium ${
        WARNA[peran] ?? WARNA.fismed
      }`}
    >
      {labelPeran(peran)}
    </span>
  );
}
