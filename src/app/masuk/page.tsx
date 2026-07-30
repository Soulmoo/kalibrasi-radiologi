import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { FormMasuk } from "./form";

export default async function HalamanMasuk() {
  if (await getUser()) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-[var(--brand)]">
            Aplikasi Kalibrasi Alat Radiologi
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Alat bantu kalkulasi &amp; penulisan laporan hasil kalibrasi
          </p>
        </div>

        <div className="kartu p-6">
          <h2 className="mb-4 text-base font-semibold">Masuk</h2>
          <FormMasuk />
          <p className="mt-4 text-center text-sm text-[var(--muted)]">
            Belum punya akun?{" "}
            <Link href="/daftar" className="font-medium text-[var(--brand)] hover:underline">
              Buat akun
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
