const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** "11 Agustus 2025" — format tanggal yang dipakai di dokumen laporan. */
export function tanggalPanjang(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const t = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(t.getTime())) return "-";
  return `${t.getDate()} ${BULAN[t.getMonth()]} ${t.getFullYear()}`;
}

/** "2025-08-11" untuk <input type="date"> */
export function tanggalInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const t = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(t.getTime())) return "";
  const bln = String(t.getMonth() + 1).padStart(2, "0");
  const tgl = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${bln}-${tgl}`;
}

/** Nama Fismed + gelar untuk kolom tanda tangan. */
export function namaLengkap(
  user: { nama: string; gelar?: string | null } | null | undefined,
): string {
  if (!user) return "-";
  return user.gelar ? `${user.nama}, ${user.gelar}` : user.nama;
}

export function teksAtauStrip(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v);
  return s === "" ? "-" : s;
}
