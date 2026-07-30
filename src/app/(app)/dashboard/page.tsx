import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { TEMPLATES, namaJenisAlat } from "@/lib/templates";
import { tanggalPanjang } from "@/lib/format";

export default async function Dashboard() {
  const user = await requireUser();

  const [jumlahLaporan, jumlahInstansi, jumlahAlat, alatUkurKadaluarsa, terbaru] =
    await Promise.all([
      prisma.laporan.count(),
      prisma.instansi.count(),
      prisma.alatRadiologi.count(),
      prisma.alatUkur.findMany({
        where: { masaKalibrasiSampai: { lt: new Date() } },
        orderBy: { masaKalibrasiSampai: "asc" },
        take: 5,
      }),
      prisma.laporan.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: { instansi: true, user: true },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Halo, {user.nama}</h1>
          <p className="text-sm text-[var(--muted)]">
            Modalitas tersedia: {TEMPLATES.map((t) => t.nama).join(", ")}.
          </p>
        </div>
        <Link href="/laporan/baru" className="tombol tombol-utama">
          + Laporan Kalibrasi Baru
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Statistik label="Laporan tersimpan" nilai={jumlahLaporan} href="/laporan" />
        <Statistik label="Instansi / klien" nilai={jumlahInstansi} href="/instansi" />
        <Statistik label="Alat radiologi terdaftar" nilai={jumlahAlat} href="/alat" />
      </div>

      {alatUkurKadaluarsa.length > 0 && (
        <div className="kartu border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">
            Alat ukur dengan masa kalibrasi terlewat
          </h2>
          <p className="mt-1 text-xs text-amber-800">
            Ditampilkan sebagai informasi saja — sistem tidak memblokir pemakaiannya.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {alatUkurKadaluarsa.map((a) => (
              <li key={a.id}>
                {a.nama}
                {a.noSeri ? ` (${a.noSeri})` : ""} — berlaku s/d{" "}
                {tanggalPanjang(a.masaKalibrasiSampai)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="kartu">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold">Laporan terakhir dikerjakan</h2>
        </div>
        {terbaru.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            Belum ada laporan. Mulai dari{" "}
            <Link href="/laporan/baru" className="text-[var(--brand)] hover:underline">
              buat laporan baru
            </Link>
            .
          </p>
        ) : (
          <table className="tabel-data">
            <thead>
              <tr>
                <th>Nomor / Instansi</th>
                <th>Jenis Alat</th>
                <th>Tanggal Uji</th>
                <th>Fismed</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {terbaru.map((l) => (
                <tr key={l.id}>
                  <td>
                    <span className="block font-medium">
                      {l.nomorLaporan || "(tanpa nomor)"}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {l.instansi.namaInstansi}
                    </span>
                  </td>
                  <td>{namaJenisAlat(l.jenisAlat)}</td>
                  <td>{tanggalPanjang(l.tanggalUji)}</td>
                  <td>{l.user.nama}</td>
                  <td className="text-right">
                    <Link href={`/laporan/${l.id}`} className="text-[var(--brand)] hover:underline">
                      Buka
                    </Link>
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

function Statistik({
  label,
  nilai,
  href,
}: {
  label: string;
  nilai: number;
  href: string;
}) {
  return (
    <Link href={href} className="kartu block p-4 transition hover:border-[var(--brand)]">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{nilai}</p>
    </Link>
  );
}
