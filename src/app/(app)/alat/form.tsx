"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { simpanAlat, type AksiState } from "@/app/actions/master";
import { Field, PesanError } from "@/components/field";
import { TEMPLATES, getTemplate } from "@/lib/templates";

type Alat = {
  id: string;
  instansiId: string;
  jenisAlat: string;
  namaAlat: string | null;
  lokasiUnit: string | null;
  merk: string | null;
  model: string | null;
  noSeri: string | null;
  tahunProduksi: string | null;
  konfigurasi: Record<string, string | string[]>;
};

export function FormAlat({
  alat,
  instansi,
}: {
  alat?: Alat;
  instansi: { id: string; namaInstansi: string; namaFasilitas: string | null }[];
}) {
  const [state, action, pending] = useActionState<AksiState, FormData>(simpanAlat, {});
  const [jenis, setJenis] = useState(alat?.jenisAlat ?? TEMPLATES[0].key);

  const template = getTemplate(jenis);
  const konf = alat?.konfigurasi ?? {};

  return (
    <form action={action} className="space-y-5">
      {alat && <input type="hidden" name="id" value={alat.id} />}

      <div className="kartu p-5">
        <h2 className="mb-4 text-sm font-semibold">Identitas Alat</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instansi / Klien" required>
            <select name="instansiId" required defaultValue={alat?.instansiId ?? ""} className="input-dasar">
              <option value="" disabled>
                — pilih instansi —
              </option>
              {instansi.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.namaInstansi}
                  {i.namaFasilitas ? ` — ${i.namaFasilitas}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Jenis Alat"
            required
            petunjuk="Menentukan field konfigurasi dan parameter uji yang dipakai."
          >
            <select
              name="jenisAlat"
              required
              value={jenis}
              onChange={(e) => setJenis(e.target.value)}
              className="input-dasar"
            >
              {TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.nama}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Nama / Label Alat" name="namaAlat" defaultValue={alat?.namaAlat} placeholder="CT-Scan Radiologi Pusat" />
          <Field label="Lokasi Unit" name="lokasiUnit" defaultValue={alat?.lokasiUnit} placeholder="R. Cito Bed" />
          <Field label="Pabrikan / Merk" name="merk" defaultValue={alat?.merk} />
          <Field label="Model / Tipe" name="model" defaultValue={alat?.model} />
          <Field label="Nomor Seri" name="noSeri" defaultValue={alat?.noSeri} />
          <Field label="Tahun Produksi" name="tahunProduksi" defaultValue={alat?.tahunProduksi} />
        </div>
      </div>

      {template && (
        <div className="kartu p-5">
          <h2 className="text-sm font-semibold">Data Konfigurasi — {template.nama}</h2>
          <p className="mb-4 mt-1 text-xs text-[var(--muted)]">
            Field semi-tetap yang dicetak pada bagian &ldquo;B. Data Konfigurasi&rdquo; laporan.
            Cukup diisi sekali, kecuali ada penggantian komponen. Kosongkan yang tidak berlaku.
          </p>

          <div className="space-y-5">
            {template.konfigurasi.map((grup) => (
              <fieldset key={grup.id} className="rounded border border-[var(--border)] p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {grup.judul}
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {grup.fields.map((f) => {
                    const nilai = konf[f.key];
                    if (f.jenis === "pilihan") {
                      return (
                        <Field key={f.key} label={f.label}>
                          <select
                            name={`konf.${f.key}`}
                            defaultValue={typeof nilai === "string" ? nilai : ""}
                            className="input-dasar"
                          >
                            <option value="">—</option>
                            {f.opsi?.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </Field>
                      );
                    }
                    if (f.jenis === "multi") {
                      const terpilih = Array.isArray(nilai) ? nilai : [];
                      return (
                        <div key={f.key}>
                          <span className="mb-1 block text-sm font-medium">{f.label}</span>
                          <div className="flex flex-wrap gap-4 pt-1">
                            {f.opsi?.map((o) => (
                              <label key={o} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  name={`konf.${f.key}`}
                                  value={o}
                                  defaultChecked={terpilih.includes(o)}
                                />
                                {o}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <Field
                        key={f.key}
                        label={f.satuan ? `${f.label} (${f.satuan})` : f.label}
                        name={`konf.${f.key}`}
                        defaultValue={typeof nilai === "string" ? nilai : ""}
                        placeholder={f.placeholder}
                      />
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
      )}

      <PesanError pesan={state.error} />

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="tombol tombol-utama">
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        <Link href="/alat" className="tombol tombol-sekunder">
          Batal
        </Link>
      </div>
    </form>
  );
}
