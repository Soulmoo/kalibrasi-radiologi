import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { FormDaftar } from "./form";

export default async function HalamanDaftar() {
  if (await getUser()) redirect("/dashboard");

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
