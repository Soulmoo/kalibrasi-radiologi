import Link from "next/link";
import { redirect } from "next/navigation";
import { googleAktif } from "@/lib/oauth";
import { getUser } from "@/lib/session";
import { PemisahAtau, TombolGoogle } from "../tombol-google";
import { FormDaftar } from "./form";

export default async function HalamanDaftar() {
  if (await getUser()) redirect("/dashboard");

  const pakaiGoogle = googleAktif();

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-[var(--brand)]">
            Aplikasi Kalibrasi Alat Radiologi
          </h1>
        </div>

        <div className="kartu p-6">
          <h2 className="mb-1 text-base font-semibold">Buat Akun</h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Nama dan gelar akan terisi otomatis pada kolom tanda tangan laporan.
          </p>

          {pakaiGoogle && (
            <>
              <TombolGoogle label="Buat akun dengan Google" />
              <p className="mt-2 text-center text-xs text-[var(--muted)]">
                Gelar dan NIP dilengkapi belakangan di halaman Profil.
              </p>
              <PemisahAtau />
            </>
          )}

          <FormDaftar />
          <p className="mt-4 text-center text-sm text-[var(--muted)]">
            Sudah punya akun?{" "}
            <Link href="/masuk" className="font-medium text-[var(--brand)] hover:underline">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
