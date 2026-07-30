"use client";

import { useActionState } from "react";
import { daftar, type FormState } from "@/app/actions/auth";

const awal: FormState = {};

export function FormDaftar() {
  const [state, action, pending] = useActionState(daftar, awal);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="nama" className="mb-1 block text-sm font-medium">
          Nama Lengkap
        </label>
        <input id="nama" name="nama" required className="input-dasar" placeholder="Sayyid Al Hakim" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="gelar" className="mb-1 block text-sm font-medium">
            Gelar
          </label>
          <input id="gelar" name="gelar" className="input-dasar" placeholder="S.Si" />
        </div>
        <div>
          <label htmlFor="nip" className="mb-1 block text-sm font-medium">
            NIP <span className="font-normal text-[var(--muted)]">(opsional)</span>
          </label>
          <input id="nip" name="nip" className="input-dasar" />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input-dasar" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Kata Sandi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input-dasar"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">Minimal 8 karakter.</p>
      </div>

      {state.error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="tombol tombol-utama w-full">
        {pending ? "Memproses…" : "Buat Akun"}
      </button>
    </form>
  );
}
