import Link from "next/link";
import { keluar } from "@/app/actions/auth";
import { namaLengkap } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { MenuMobile, NavUtama } from "./nav";

export default async function LayoutAplikasi({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-col">
      <header className="tanpa-cetak border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          {/* Di HP seluruh navigasi — termasuk Profil dan Keluar — masuk ke
              kolom geser ini, sehingga header tidak lagi berjejal. */}
          <MenuMobile nama={namaLengkap(user)} email={user.email} />

          <Link href="/dashboard" className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--brand)]">
              Kalibrasi Alat Radiologi
            </span>
            <span className="hidden truncate text-xs text-[var(--muted)] sm:block">
              Alat bantu kalkulasi &amp; penulisan laporan
            </span>
          </Link>

          {/* Identitas & Keluar hanya di layar lebar; di HP sudah ada di kolom. */}
          <div className="hidden min-w-0 items-center gap-3 md:flex">
            <Link href="/profil" className="min-w-0 text-right text-xs hover:underline">
              <span className="block truncate font-medium">{namaLengkap(user)}</span>
              <span className="block truncate text-[var(--muted)]">{user.email}</span>
            </Link>
            <form action={keluar} className="shrink-0">
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
