import { TabelGulir } from "@/components/field";
import Link from "next/link";
import { filterLaporan, filterMilik } from "@/lib/akses";
import { BIDANG, getBidang, rute, type KunciBidang } from "@/lib/bidang";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { bidangDariJenisAlat, namaJenisAlat } from "@/lib/templates";
import { tanggalPanjang } from "@/lib/format";
import { PanduanAwal } from "./panduan";

/**
 * Dashboard berdiri di luar bidang (`/dashboard`, bukan `/radiologi/...`):
 * ringkasan seluruh pekerjaan Fismed, dengan hitungan dipecah per bidang dan
 * setiap link diarahkan ke bidang milik datanya.
 */
export default async function Dashboard() {
  const user = await requireUser();

  const milik = filterMilik(user);
  const milikLaporan = filterLaporan(user);

  const [
    laporanPerJenis,
    alatPerJenis,
    jumlahInstansi,
    alatUkurKadaluarsa,
    terbaru,
    profil,
  ] = await Promise.all([
      // Dihitung per jenisAlat lalu dijumlahkan per bidang di TypeScript —
      // bidang tidak disimpan di database, ia turunan dari template.
      prisma.laporan.groupBy({ by: ["jenisAlat"], where: milikLaporan, _count: true }),
      prisma.alatRadiologi.groupBy({ by: ["jenisAlat"], where: milik, _count: true }),
      prisma.instansi.count({ where: milik }),
      prisma.alatUkur.findMany({
        where: { ...milik, masaKalibrasiSampai: { lt: new Date() } },
        orderBy: { masaKalibrasiSampai: "asc" },
        take: 5,
        select: { id: true, nama: true, noSeri: true, masaKalibrasiSampai: true },
      }),
      prisma.laporan.findMany({
        where: milikLaporan,
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          nomorLaporan: true,
          jenisAlat: true,
          tanggalUji: true,
          instansi: { select: { namaInstansi: true } },
        },
      }),
      // Hanya untuk mengetahui apakah tanda tangannya sudah ada. Gambarnya
      // sendiri tidak pernah dibawa ke sini — lihat catatan di profil/page.tsx
      // soal ukuran cookie sesi.
      prisma.user.findUnique({
        where: { id: user.id },
        select: { tandaTanganGambar: true },
      }),
    ]);

  const perBidang = (baris: { jenisAlat: string; _count: number }[]) => {
    const jumlah = Object.fromEntries(BIDANG.map((b) => [b.key, 0])) as Record<KunciBidang, number>;
    for (const r of baris) jumlah[bidangDariJenisAlat(r.jenisAlat)] += r._count;
    return jumlah;
  };
  const jumlahLaporan = perBidang(laporanPerJenis);
  const jumlahAlat = perBidang(alatPerJenis);

  return (
    <div className="space-y-6">
      <PanduanAwal
        userId={user.id}
        punyaTandaTangan={Boolean(profil?.tandaTanganGambar)}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Halo, {user.nama}</h1>
          <p className="text-sm text-[var(--muted)]">
           Semoga Harimu Menyenangkan!
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {BIDANG.map((b) => (
            <Link key={b.key} href={rute(b.key, "/laporan/baru")} className="tombol tombol-utama">
              + Laporan {b.nama}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {BIDANG.map((b) => (
          <div key={b.key} className="kartu p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
              {b.nama}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Statistik label="Laporan" nilai={jumlahLaporan[b.key]} href={rute(b.key, "/laporan")} />
              <Statistik label="Alat" nilai={jumlahAlat[b.key]} href={rute(b.key, "/alat")} />
            </div>
          </div>
        ))}
        <div className="kartu p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
            Semua bidang
          </p>
          <div className="mt-2">
            <Statistik
              label="Instansi / klien"
              nilai={jumlahInstansi}
              href={rute(BIDANG[0].key, "/instansi")}
            />
          </div>
        </div>
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
            Belum ada laporan. Mulai dari tombol &ldquo;+ Laporan&rdquo; di atas.
          </p>
        ) : (
          <TabelGulir>
            <table className="tabel-data">
              <thead>
                <tr>
                  <th>Nomor / Instansi</th>
                  <th>Bidang</th>
                  <th>Jenis Alat</th>
                  <th>Tanggal Uji</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {terbaru.map((l) => {
                  const bidang = bidangDariJenisAlat(l.jenisAlat);
                  return (
                    <tr key={l.id}>
                      <td>
                        <span className="block font-medium">
                          {l.nomorLaporan || "(tanpa nomor)"}
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          {l.instansi.namaInstansi}
                        </span>
                      </td>
                      <td>{getBidang(bidang)?.nama}</td>
                      <td>{namaJenisAlat(l.jenisAlat)}</td>
                      <td>{tanggalPanjang(l.tanggalUji)}</td>
                      <td className="text-right">
                        <Link
                          href={rute(bidang, `/laporan/${l.id}`)}
                          className="text-[var(--brand)] hover:underline"
                        >
                          Buka
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TabelGulir>
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
    <Link
      href={href}
      className="block rounded border border-[var(--border)] p-3 transition hover:border-[var(--brand)]"
    >
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{nilai}</p>
    </Link>
  );
}
