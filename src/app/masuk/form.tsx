"use client";

import { useActionState } from "react";
import { masuk, type FormState } from "@/app/actions/auth";

const awal: FormState = {};

export function FormMasuk() {
  const [state, action, pending] = useActionState(masuk, awal);

  return (
    <form action={action} className="space-y-3">
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
          autoComplete="current-password"
          className="input-dasar"
        />
      </div>

      {state.error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="tombol tombol-utama w-full">
        {pending ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}
