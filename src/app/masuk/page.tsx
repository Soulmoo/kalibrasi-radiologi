import Link from "next/link";
import { redirect } from "next/navigation";
import { googleAktif } from "@/lib/oauth";
import { getUser } from "@/lib/session";
import { PemisahAtau, TombolGoogle } from "../tombol-google";
import { FormMasuk } from "./form";

/**
 * Pesan kegagalan dari Auth.js. Kodenya datang lewat ?error= karena
 * `pages.error` di src/auth.ts diarahkan ke halaman ini.
 */
const PESAN_ERROR: Record<string, string> = {
  // signIn callback menolak: email Google-nya belum terverifikasi.
  AccessDenied:
    "Akun Google itu emailnya belum terverifikasi, jadi belum bisa dipakai masuk. " +
    "Verifikasi dulu emailnya di Google, atau masuk dengan email dan kata sandi.",
  Configuration:
    "Masuk dengan Google belum dikonfigurasi dengan benar di server. " +
    "Hubungi pengelola aplikasi.",
  OAuthSignin: "Gagal menghubungi Google. Coba lagi sebentar lagi.",
  OAuthCallback: "Google menolak proses masuknya. Coba lagi.",
  Verification: "Tautan verifikasinya sudah tidak berlaku.",
  // Akun yang dibuat lewat Google tidak punya kata sandi, jadi jalur ini juga
  // yang muncul kalau akun seperti itu dicoba masuk lewat email + kata sandi.
  CredentialsSignin:
    "Email atau kata sandi salah. Kalau akun ini dibuat lewat Google, " +
    "masuklah dengan tombol Google.",
};

export default async function HalamanMasuk({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getUser()) redirect("/dashboard");

  const { error } = await searchParams;
  const pesanError = error
    ? (PESAN_ERROR[error] ?? "Gagal masuk. Coba lagi atau pakai email dan kata sandi.")
    : null;

  const pakaiGoogle = googleAktif();

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

          {pesanError && (
            <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {pesanError}
            </p>
          )}

          {pakaiGoogle && (
            <>
              <TombolGoogle />
              <PemisahAtau />
            </>
          )}

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
