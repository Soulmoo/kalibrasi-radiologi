import Link from "next/link";
import { notFound } from "next/navigation";
import { KosongPesan } from "@/components/field";
import { pastikanAdmin } from "@/lib/akses";
import { tanggalPanjang } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { emailMaster, labelPeran } from "@/lib/peran";
import { namaJenisAlat } from "@/lib/templates";

export default async function LaporanFismed({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  pastikanAdmin(user);

  const { id } = await params;

  const fismed = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { laporan: true } },
    },
  });
  if (!fismed) notFound();

  const [laporan, jumlahInstansi, jumlahAlat] = await Promise.all([
    prisma.laporan.findMany({
      where: { userId: id },
      orderBy: { tanggalUji: "desc" },
      include: { instansi: true, alatRadiologi: true },
    }),
    prisma.instansi.count({ where: { createdById: id } }),
    prisma.alatRadiologi.count({ where: { createdById: id } }),
  ]);

  const targetMaster = fismed.peran === "master" || emailMaster(fismed.email);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            {fismed.nama}
            {fismed.gelar ? `, ${fismed.gelar}` : ""}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {fismed.email} · {targetMaster ? "Master" : labelPeran(fismed.peran)} ·
            bergabung{" "}
            {tanggalPanjang(fismed.createdAt)}
          </p>
        </div>
        <Link href="/profil/fismed" className="tombol tombol-sekunder">
          ← Kembali ke daftar
        </Link>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Angka label="Laporan" nilai={fismed._count.laporan} />
        <Angka label="Instansi / klien" nilai={jumlahInstansi} />
        <Angka label="Alat radiologi" nilai={jumlahAlat} />
      </div>

      <div className="kartu overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h3 className="text-sm font-semibold">Laporan yang telah dikalibrasi</h3>
        </div>
        {laporan.length === 0 ? (
          <KosongPesan>Fismed ini belum membuat laporan.</KosongPesan>
        ) : (
          <table className="tabel-data">
            <thead>
              <tr>
                <th>Nomor Laporan</th>
                <th>Instansi</th>
                <th>Jenis Alat</th>
                <th>Tanggal Uji</th>
                <th>Status</th>
                <th className="w-40"></th>
              </tr>
            </thead>
            <tbody>
              {laporan.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium">{l.nomorLaporan || "(tanpa nomor)"}</td>
                  <td>{l.instansi.namaInstansi}</td>
                  <td>{namaJenisAlat(l.jenisAlat)}</td>
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
                      <Link
                        href={`/laporan/${l.id}/cetak`}
                        className="tombol tombol-sekunder"
                      >
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

      <p className="mt-3 text-xs text-[var(--muted)]">
        Laporan Fismed lain dibuka dalam mode baca-saja — bisa dilihat dan dicetak,
        tetapi tidak bisa disunting. Kepemilikannya pun tidak berpindah: nama Fismed
        pembuatnya tetap yang tercetak di kolom tanda tangan.
      </p>

      {user.master && (
        <p className="mt-1 text-xs text-[var(--muted)]">
          Penghapusan akun ada di daftar Fismed, lewat tombol tempat sampah di baris
          akun yang bersangkutan.
        </p>
      )}
    </div>
  );
}

function Angka({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="kartu p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{nilai}</p>
    </div>
  );
}
