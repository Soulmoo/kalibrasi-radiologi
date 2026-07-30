"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { buatLaporan, type AksiState } from "@/app/actions/laporan";
import { Field, PesanError } from "@/components/field";

type Opsi = { id: string; label: string; lokasiUnit: string };

function hariIni() {
  const d = new Date();
  const bln = String(d.getMonth() + 1).padStart(2, "0");
  const tgl = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${bln}-${tgl}`;
}

export function FormLaporanBaru({ alat }: { alat: Opsi[] }) {
  const [state, action, pending] = useActionState<AksiState, FormData>(buatLaporan, {});
  const [pilihan, setPilihan] = useState(alat[0]?.id ?? "");

  const terpilih = alat.find((a) => a.id === pilihan);

  return (
    <form action={action} className="space-y-5">
      <div className="kartu p-5">
        <div className="grid gap-4">
          <Field label="Alat Radiologi" required>
            <select
              name="alatRadiologiId"
              required
              value={pilihan}
              onChange={(e) => setPilihan(e.target.value)}
              className="input-dasar"
            >
              {alat.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tanggal Uji" name="tanggalUji" type="date" defaultValue={hariIni()} required />
            <Field
              label="Nomor Laporan"
              name="nomorLaporan"
              placeholder="I/PK/C-01/VIII/25"
              petunjuk="Boleh dikosongkan dan diisi belakangan."
            />
            <Field label="Nomor Order" name="nomorOrder" placeholder="E-138 PRUK" />
          </div>

          <Field
            label="Lokasi Uji"
            name="lokasiUji"
            defaultValue={terpilih?.lokasiUnit}
            key={pilihan}
            petunjuk="Terisi dari lokasi unit alat, bisa diubah."
          />
        </div>
      </div>

      <PesanError pesan={state.error} />

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="tombol tombol-utama">
          {pending ? "Membuat…" : "Lanjut ke Form Parameter Uji"}
        </button>
        <Link href="/laporan" className="tombol tombol-sekunder">
          Batal
        </Link>
      </div>
    </form>
  );
}
