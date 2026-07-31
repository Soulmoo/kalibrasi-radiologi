"use client";

import { useFormStatus } from "react-dom";
import { masukGoogle } from "@/app/actions/auth";

/**
 * Tombol "Masuk dengan Google" untuk halaman masuk & daftar.
 *
 * Hanya dirender kalau Google memang dikonfigurasi — lihat `googleAktif()` di
 * src/lib/oauth.ts dan pemakaiannya di kedua halaman itu.
 */
export function TombolGoogle({ label = "Masuk dengan Google" }: { label?: string }) {
  return (
    <form action={masukGoogle}>
      <Tombol label={label} />
    </form>
  );
}

function Tombol({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tombol tombol-sekunder w-full"
    >
      <LogoGoogle />
      {pending ? "Mengalihkan ke Google…" : label}
    </button>
  );
}

/** Logo resmi Google, empat warna. */
function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

/** Pemisah "atau" antara tombol Google dan form email+sandi. */
export function PemisahAtau() {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--border)]" />
      <span className="text-xs text-[var(--muted)]">atau</span>
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}
