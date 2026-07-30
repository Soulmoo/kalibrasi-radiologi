import Link from "next/link";
import { JudulHalaman, KosongPesan } from "@/components/field";
import { filterLaporan } from "@/lib/akses";
import { tanggalPanjang } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { TEMPLATES, namaJenisAlat } from "@/lib/templates";
import type { Prisma } from "@prisma/client";

export default async function HalamanLaporan({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; jenis?: string }>;
}) {
  const user = await requireUser();
  const { q, jenis } = await searchParams;

  // Daftar ini selalu berisi laporan milik sendiri saja. Laporan Fismed lain
  // diakses admin lewat Profil → Fismed.
  const where: Prisma.LaporanWhereInput = { ...filterLaporan(user) };
  if (jenis) where.jenisAlat = jenis;
  if (q) {
    // mode "insensitive" hanya didukung Postgres — pencarian jadi tidak
    // membedakan huruf besar/kecil.
    const cari = { contains: q, mode: "insensitive" } as const;
    where.OR = [
      { nomorLaporan: cari },
      { lokasiUji: cari },
      { instansi: { namaInstansi: cari } },
      { instansi: { namaFasilitas: cari } },
      { alatRadiologi: { namaAlat: cari } },
      { alatRadiologi: { noSeri: cari } },
    ];
  }

  const daftar = await prisma.laporan.findMany({
    where,
    orderBy: { tanggalUji: "desc" },
    include: { instansi: true, alatRadiologi: true, user: true },
    take: 100,
  });

  return (
    <div>
      <JudulHalaman
        judul="Riwayat Laporan"
        keterangan="Cari berdasarkan klien, nomor laporan, jenis alat, atau nomor seri."
        aksi={
          <Link href="/laporan/baru" className="tombol tombol-utama">
            + Laporan Baru
          </Link>
        }
      />

      <form className="kartu mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-56 flex-1">
          <span className="mb-1 block text-sm font-medium">Kata kunci</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Nama instansi, nomor laporan, no. seri…"
            className="input-dasar"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Jenis alat</span>
          <select name="jenis" defaultValue={jenis ?? ""} className="input-dasar">
            <option value="">Semua</option>
            {TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.nama}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="tombol tombol-sekunder">
          Cari
        </button>
        {(q || jenis) && (
          <Link href="/laporan" className="tombol tombol-sekunder">
            Reset
          </Link>
        )}
      </form>

      <div className="kartu overflow-hidden">
        {daftar.length === 0 ? (
          <KosongPesan>Tidak ada laporan yang cocok.</KosongPesan>
        ) : (
          <table className="tabel-data">
            <thead>
              <tr>
                <th>Nomor Laporan</th>
                <th>Instansi</th>
                <th>Jenis Alat</th>
                <th>Lokasi Unit</th>
                <th>Tanggal Uji</th>
                <th>Status</th>
                <th className="w-40"></th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium">{l.nomorLaporan || "(tanpa nomor)"}</td>
                  <td>
                    <span className="block">{l.instansi.namaInstansi}</span>
                    {l.instansi.namaFasilitas && (
                      <span className="text-xs text-[var(--muted)]">
                        {l.instansi.namaFasilitas}
                      </span>
                    )}
                  </td>
                  <td>{namaJenisAlat(l.jenisAlat)}</td>
                  <td>{l.lokasiUji ?? l.alatRadiologi.lokasiUnit ?? "-"}</td>
                  <td>{tanggalPanjang(l.tanggalUji)}</td>
                  <td>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        l.status === "selesai"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {l.status === "selesai" ? "Selesai" : "Draf"}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link href={`/laporan/${l.id}`} className="tombol tombol-sekunder">
                        Buka
                      </Link>
                      <Link href={`/laporan/${l.id}/cetak`} className="tombol tombol-sekunder">
                        PDF
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
