"use client";

import Link from "next/link";
import { useActionState } from "react";
import { simpanInstansi, type AksiState } from "@/app/actions/master";
import { Field, PesanError } from "@/components/field";

type Instansi = {
  id: string;
  namaInstansi: string;
  namaFasilitas: string | null;
  identitasPemilik: string | null;
  alamat: string | null;
  kota: string | null;
  provinsi: string | null;
  telepon: string | null;
  email: string | null;
  nib: string | null;
  nomorIzinPesawat: string | null;
  namaPPR: string | null;
  noSIB: string | null;
};

export function FormInstansi({ instansi }: { instansi?: Instansi }) {
  const [state, action, pending] = useActionState<AksiState, FormData>(
    simpanInstansi,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      {instansi && <input type="hidden" name="id" value={instansi.id} />}

      <div className="kartu p-5">
        <h2 className="mb-4 text-sm font-semibold">Identitas Fasilitas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama Instansi" name="namaInstansi" required defaultValue={instansi?.namaInstansi} placeholder="PT. Affinity Health Indonesia" />
          <Field label="Nama Fasilitas" name="namaFasilitas" defaultValue={instansi?.namaFasilitas} placeholder="RS Premier Surabaya" />
          <Field label="Identitas Pemilik" name="identitasPemilik" defaultValue={instansi?.identitasPemilik} placeholder="Swasta / Pemerintah" />
          <Field label="NIB" name="nib" defaultValue={instansi?.nib} />
        </div>
      </div>

      <div className="kartu p-5">
        <h2 className="mb-4 text-sm font-semibold">Alamat &amp; Kontak</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Alamat" name="alamat" defaultValue={instansi?.alamat} placeholder="Jalan Nginden Intan Barat Blok B" />
          </div>
          <Field label="Kota" name="kota" defaultValue={instansi?.kota} placeholder="Surabaya" />
          <Field label="Provinsi" name="provinsi" defaultValue={instansi?.provinsi} placeholder="Jawa Timur" />
          <Field label="Telepon" name="telepon" defaultValue={instansi?.telepon} placeholder="031 - 5993211" />
          <Field label="Email" name="email" type="email" defaultValue={instansi?.email} />
        </div>
      </div>

      <div className="kartu p-5">
        <h2 className="mb-4 text-sm font-semibold">Perizinan &amp; Proteksi Radiasi</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nomor Izin Pesawat" name="nomorIzinPesawat" defaultValue={instansi?.nomorIzinPesawat} placeholder="07235.384.3.250725" />
          <Field label="Nama PPR" name="namaPPR" defaultValue={instansi?.namaPPR} petunjuk="Petugas Proteksi Radiasi" />
          <Field label="No. SIB" name="noSIB" defaultValue={instansi?.noSIB} />
        </div>
      </div>

      <PesanError pesan={state.error} />

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="tombol tombol-utama">
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        <Link href="/instansi" className="tombol tombol-sekunder">
          Batal
        </Link>
      </div>
    </form>
  );
}
