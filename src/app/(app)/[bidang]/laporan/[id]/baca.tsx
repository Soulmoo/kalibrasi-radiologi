import { BlokLembar } from "@/components/lembar";
import { rekapLaporan } from "@/lib/evaluasi";
import { tanggalPanjang, teksAtauStrip } from "@/lib/format";
import type { HasilUji, Template } from "@/lib/templates/types";

/**
 * Tampilan laporan baca-saja. Dipakai untuk dua keadaan yang berbeda:
 *
 * - `lintas-fismed` — admin/master membuka laporan Fismed lain.
 * - `terkunci` — laporan sudah disimpan permanen, jadi pemiliknya sendiri pun
 *   tidak bisa menyuntingnya lagi.
 *
 * Angka hasil uji tidak ditampilkan sebagai input, melainkan sebagai tabel
 * hasil hitung yang sama persis dengan yang tercetak di PDF. Ini bukan sekadar
 * menyembunyikan tombol simpan: form suntingnya memang tidak dirender, dan
 * server action `simpanLaporan` menolak kedua keadaan itu sekali lagi.
 */

export type AlasanBacaSaja = "lintas-fismed" | "terkunci";

export type LaporanBaca = {
  nomorLaporan: string | null;
  nomorOrder: string | null;
  tanggalUji: Date;
  tanggalTerbit: Date | null;
  lokasiUji: string | null;
  metodeKerja: string | null;
  kesimpulan: string | null;
  catatan: string | null;
  rekomendasi: string | null;
  status: string;
  namaInstansi: string;
  namaAlat: string;
  alatUkur: {
    id: string;
    nama: string;
    merek: string | null;
    modelTipe: string | null;
    noSeri: string | null;
    masaKalibrasiTeks: string;
  }[];
};

export function LaporanBacaSaja({
  laporan,
  template,
  hasil,
  pemilik,
  alasan,
}: {
  laporan: LaporanBaca;
  template: Template;
  hasil: HasilUji;
  pemilik: string;
  alasan: AlasanBacaSaja;
}) {
  const rekap = rekapLaporan(template, hasil);

  return (
    <div className="space-y-5">
      {alasan === "terkunci" ? (
        <p className="rounded border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
          <strong>Tersimpan permanen.</strong> Laporan ini sudah ditandatangani dan
          dikunci, jadi isinya tidak dapat diubah lagi oleh siapa pun — termasuk Anda
          sendiri. Masih bisa dibuka, dicetak, dan diekspor jadi PDF.
        </p>
      ) : (
        <p className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Mode baca-saja.</strong> Laporan ini milik {pemilik}. Isinya hanya bisa
          diubah oleh Fismed yang mengerjakan pengukurannya — Anda bisa membuka dan
          mencetaknya, tetapi tidak menyuntingnya.
        </p>
      )}

      <div className="kartu p-5">
        <h2 className="mb-3 text-sm font-semibold">Identitas laporan</h2>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Data label="Nomor laporan" nilai={teksAtauStrip(laporan.nomorLaporan)} />
          <Data label="Nomor order" nilai={teksAtauStrip(laporan.nomorOrder)} />
          <Data label="Fisikawan medis" nilai={pemilik} />
          <Data label="Instansi / klien" nilai={laporan.namaInstansi} />
          <Data label="Alat radiologi" nilai={laporan.namaAlat} />
          <Data label="Jenis alat" nilai={template.nama} />
          <Data label="Tanggal uji" nilai={tanggalPanjang(laporan.tanggalUji)} />
          <Data label="Tanggal terbit" nilai={tanggalPanjang(laporan.tanggalTerbit)} />
          <Data label="Lokasi uji" nilai={teksAtauStrip(laporan.lokasiUji)} />
          <Data label="Metode kerja" nilai={teksAtauStrip(laporan.metodeKerja)} />
          <Data
            label="Status"
            nilai={laporan.status === "selesai" ? "Selesai" : "Draf"}
          />
        </dl>
      </div>

      <div className="kartu p-5">
        <h2 className="mb-3 text-sm font-semibold">Rekap hasil</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Pil warna="bg-green-100 text-green-800" label="Lolos" nilai={rekap.lolos} />
          <Pil
            warna="bg-red-100 text-red-800"
            label="Tidak lolos"
            nilai={rekap.tidakLolos}
          />
          <Pil
            warna="bg-gray-100 text-gray-700"
            label="Tidak dilakukan"
            nilai={rekap.tidakDiuji}
          />
        </div>
        {rekap.daftarGagal.length > 0 && (
          <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm text-red-800">
            {rekap.daftarGagal.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        )}
      </div>

      {template.seksi.map((seksi) => (
        <div key={seksi.id} className="kartu p-5">
          <h2 className="mb-3 text-sm font-semibold">{seksi.judul}</h2>
          <div className="lembar overflow-x-auto">
            {seksi.blok.map((b) => (
              <BlokLembar key={b.id} blok={b} hasil={hasil} />
            ))}
          </div>
        </div>
      ))}

      <div className="kartu p-5">
        <h2 className="mb-3 text-sm font-semibold">Alat ukur yang digunakan</h2>
        {laporan.alatUkur.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Belum ada alat ukur yang ditautkan.
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {laporan.alatUkur.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{a.nama}</span>
                <span className="text-[var(--muted)]">
                  {" — "}
                  {[a.merek, a.modelTipe, a.noSeri].filter(Boolean).join(" / ") || "-"} ·
                  masa kalibrasi s/d {a.masaKalibrasiTeks}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="kartu space-y-4 p-5">
        <Teks judul="Kesimpulan" isi={laporan.kesimpulan} />
        <Teks judul="Catatan" isi={laporan.catatan} />
        <Teks judul="Rekomendasi" isi={laporan.rekomendasi} />
      </div>
    </div>
  );
}

function Data({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5">{nilai}</dd>
    </div>
  );
}

function Pil({
  warna,
  label,
  nilai,
}: {
  warna: string;
  label: string;
  nilai: number;
}) {
  return (
    <span className={`rounded px-3 py-1 ${warna}`}>
      {label}: <strong>{nilai}</strong>
    </span>
  );
}

function Teks({ judul, isi }: { judul: string; isi: string | null }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{judul}</h2>
      <p className="mt-1 whitespace-pre-line text-sm text-[var(--muted)]">
        {teksAtauStrip(isi)}
      </p>
    </div>
  );
}
