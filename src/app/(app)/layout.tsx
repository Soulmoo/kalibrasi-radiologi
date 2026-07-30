import Link from "next/link";
import { keluar } from "@/app/actions/auth";
import { requireUser } from "@/lib/session";
import { NavUtama } from "./nav";

export default async function LayoutAplikasi({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-col">
      <header className="tanpa-cetak border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="shrink-0">
            <span className="block text-sm font-semibold text-[var(--brand)]">
              Kalibrasi Alat Radiologi
            </span>
            <span className="block text-xs text-[var(--muted)]">
              Alat bantu kalkulasi &amp; penulisan laporan
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/profil" className="text-right text-xs hover:underline">
              <span className="block font-medium">
                {user.nama}
                {user.gelar ? `, ${user.gelar}` : ""}
              </span>
              <span className="block text-[var(--muted)]">{user.email}</span>
            </Link>
            <form action={keluar}>
              <button type="submit" className="tombol tombol-sekunder">
                Keluar
              </button>
            </form>
          </div>
        </div>
        <NavUtama />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>

      <footer className="tanpa-cetak border-t border-[var(--border)] bg-white px-4 py-3 text-center text-xs text-[var(--muted)]">
        Laporan yang dihasilkan aplikasi ini berstatus laporan kerja internal, bukan
        sertifikat resmi berlegalitas BAPETEN/BPAFK.
      </footer>
    </div>
  );
}
