"use client";

import { useActionState } from "react";
import { simpanProfil, type FormState } from "@/app/actions/auth";
import { Field, PesanError } from "@/components/field";
import { InputTandaTangan } from "./tanda-tangan";

export function FormProfil({
  user,
}: {
  user: {
    nama: string;
    gelar: string | null;
    nip: string | null;
    email: string;
    tandaTanganGambar: string | null;
  };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(simpanProfil, {});

  return (
    <form action={action} className="space-y-5">
      <div className="kartu space-y-4 p-5">
        <Field label="Nama Lengkap" name="nama" required defaultValue={user.nama} />
        <Field label="Gelar" name="gelar" defaultValue={user.gelar} placeholder="S.Si / S.Tr.Kes / M.Si" />
        <Field label="NIP" name="nip" defaultValue={user.nip} />
        <Field label="Email" petunjuk="Email tidak dapat diubah dari halaman ini.">
          <input value={user.email} disabled className="input-dasar" />
        </Field>
      </div>

      {/* Sengaja tidak dibungkus <Field>: komponennya berisi tombol dan kanvas,
          dan <Field> merender <label> — mengeklik kanvas di dalam label akan
          memicu kontrol lain. */}
      <div className="kartu space-y-4 p-5">
        <InputTandaTangan awal={user.tandaTanganGambar} />
      </div>

      <PesanError pesan={state.error} />
      {state.ok && (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Profil tersimpan. Perubahan langsung dipakai pada laporan berikutnya.
        </p>
      )}

      <button type="submit" disabled={pending} className="tombol tombol-utama">
        {pending ? "Menyimpan…" : "Simpan Profil"}
      </button>
    </form>
  );
}
