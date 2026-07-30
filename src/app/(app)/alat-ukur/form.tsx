"use client";

import Link from "next/link";
import { useActionState } from "react";
import { simpanAlatUkur, type AksiState } from "@/app/actions/master";
import { Field, PesanError } from "@/components/field";

type AlatUkur = {
  id: string;
  nama: string;
  merek: string | null;
  modelTipe: string | null;
  noSeri: string | null;
  tertelusurKe: string | null;
  masaKalibrasiSampaiInput: string;
};

export function FormAlatUkur({ alatUkur }: { alatUkur?: AlatUkur }) {
  const [state, action, pending] = useActionState<AksiState, FormData>(
    simpanAlatUkur,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      {alatUkur && <input type="hidden" name="id" value={alatUkur.id} />}

      <div className="kartu p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nama Alat"
            name="nama"
            required
            defaultValue={alatUkur?.nama}
            placeholder="Multimeter X-Ray"
          />
          <Field label="Merek" name="merek" defaultValue={alatUkur?.merek} placeholder="RTI" />
          <Field label="Model / Tipe" name="modelTipe" defaultValue={alatUkur?.modelTipe} placeholder="Piranha" />
          <Field label="Nomor Seri" name="noSeri" defaultValue={alatUkur?.noSeri} />
          <Field
            label="Tertelusur ke"
            name="tertelusurKe"
            defaultValue={alatUkur?.tertelusurKe}
            placeholder="SWEDAC"
            petunjuk="Lembaga standar acuan ketertelusuran metrologi."
          />
          <Field
            label="Masa Kalibrasi s/d"
            name="masaKalibrasiSampai"
            type="date"
            defaultValue={alatUkur?.masaKalibrasiSampaiInput}
            petunjuk="Disimpan sebagai data referensi. Sistem tidak memblokir pemakaian alat yang lewat masa kalibrasi — silakan cek sendiri."
          />
        </div>
      </div>

      <PesanError pesan={state.error} />

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="tombol tombol-utama">
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        <Link href="/alat-ukur" className="tombol tombol-sekunder">
          Batal
        </Link>
      </div>
    </form>
  );
}
