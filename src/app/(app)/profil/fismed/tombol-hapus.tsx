"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { hapusAkun } from "@/app/actions/pengguna";

/**
 * Tombol hapus akun di daftar Fismed — ikon tempat sampah merah, satu dialog
 * konfirmasi, selesai. Tidak ada lagi panel "ketik ulang email" di halaman
 * detail; penjagaan sebenarnya ada di server action `hapusAkun`.
 */
export function TombolHapusAkun({
  id,
  nama,
  email,
  jumlah,
}: {
  id: string;
  nama: string;
  email: string;
  jumlah: { laporan: number; instansi: number; alat: number; alatUkur: number };
}) {
  const [buka, setBuka] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        aria-label={`Hapus akun ${email}`}
        title="Hapus akun"
        className="tombol tombol-bahaya px-2.5"
      >
        <IkonSampah />
      </button>

      {buka && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`judul-hapus-${id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBuka(false);
          }}
        >
          <div className="kartu w-full max-w-md p-5 text-left">
            <h2 id={`judul-hapus-${id}`} className="text-sm font-semibold text-red-800">
              Hapus akun ini?
            </h2>

            <p className="mt-2 text-sm">
              <strong>{nama}</strong>
              <br />
              <span className="text-[var(--muted)]">{email}</span>
            </p>

            <p className="mt-3 text-sm text-[var(--muted)]">
              Ikut terhapus: <strong>{jumlah.laporan} laporan</strong>,{" "}
              {jumlah.instansi} instansi, {jumlah.alat} alat radiologi, dan{" "}
              {jumlah.alatUkur} alat ukur miliknya. Data yang masih dipakai laporan
              Fismed lain tidak dihapus, melainkan dialihkan kepemilikannya kepada Anda.
            </p>

            <p className="mt-2 text-sm text-red-800">
              Tindakan ini permanen dan tidak bisa dibatalkan.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBuka(false)}
                className="tombol tombol-sekunder"
              >
                Batal
              </button>
              <form action={hapusAkun}>
                <input type="hidden" name="id" value={id} />
                <TombolKonfirmasi />
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TombolKonfirmasi() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="tombol tombol-bahaya">
      {pending ? "Menghapus…" : "Ya, hapus akun"}
    </button>
  );
}

function IkonSampah() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
