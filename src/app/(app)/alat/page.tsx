import Link from "next/link";
import { hapusAlat } from "@/app/actions/master";
import { JudulHalaman, KosongPesan } from "@/components/field";
import { filterMilik } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { namaJenisAlat } from "@/lib/templates";

export default async function HalamanAlat({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;
  const milik = filterMilik(user);

  const [daftar, jumlahInstansi] = await Promise.all([
    prisma.alatRadiologi.findMany({
      where: milik,
      orderBy: [{ instansi: { namaInstansi: "asc" } }, { jenisAlat: "asc" }],
      include: { instansi: true, _count: { select: { laporan: true } } },
    }),
    prisma.instansi.count({ where: milik }),
  ]);

  return (
    <div>
      <JudulHalaman
        judul="Alat Radiologi"
        keterangan="Profil alat per unit beserta konfigurasi teknisnya — dipakai ulang tiap kalibrasi."
        aksi={
          jumlahInstansi > 0 ? (
            <Link href="/alat/baru" className="tombol tombol-utama">
              + Tambah Alat
            </Link>
          ) : null
        }
      />

      {error === "terlarang" && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Data tersebut bukan milik Anda, jadi tidak bisa dihapus.
        </p>
      )}

      {error === "terpakai" && (
        <p className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Alat tidak bisa dihapus karena masih dipakai oleh laporan tersimpan.
        </p>
      )}

      {jumlahInstansi === 0 && (
        <p className="mb-4 rounded border border-[var(--border)] bg-white px-3 py-2 text-sm">
          Tambahkan data{" "}
          <Link href="/instansi/baru" className="text-[var(--brand)] hover:underline">
            instansi / klien
          </Link>{" "}
          terlebih dahulu sebelum mendaftarkan alat.
        </p>
      )}

      <div className="kartu overflow-hidden">
        {daftar.length === 0 ? (
          <KosongPesan>Belum ada alat radiologi terdaftar.</KosongPesan>
        ) : (
          <table className="tabel-data">
            <thead>
              <tr>
                <th>Alat</th>
                <th>Jenis</th>
                <th>Instansi</th>
                <th>Lokasi Unit</th>
                <th>No. Seri</th>
                <th className="text-center">Laporan</th>
                <th className="w-40"></th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="block font-medium">
                      {a.namaAlat || `${a.merk ?? ""} ${a.model ?? ""}`.trim() || "(tanpa nama)"}
                    </span>
                    {a.merk && (
                      <span className="text-xs text-[var(--muted)]">
                        {a.merk} {a.model}
                      </span>
                    )}
                  </td>
                  <td>{namaJenisAlat(a.jenisAlat)}</td>
                  <td>{a.instansi.namaInstansi}</td>
                  <td>{a.lokasiUnit ?? "-"}</td>
                  <td>{a.noSeri ?? "-"}</td>
                  <td className="text-center">{a._count.laporan}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link href={`/alat/${a.id}`} className="tombol tombol-sekunder">
                        Ubah
                      </Link>
                      <form action={hapusAlat}>
                        <input type="hidden" name="id" value={a.id} />
                        <button type="submit" className="tombol tombol-bahaya">
                          Hapus
                        </button>
                      </form>
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
