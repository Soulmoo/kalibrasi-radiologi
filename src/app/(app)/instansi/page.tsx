import Link from "next/link";
import { hapusInstansi } from "@/app/actions/master";
import { JudulHalaman, KosongPesan, TabelGulir } from "@/components/field";
import { filterMilik } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function HalamanInstansi({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;

  const daftar = await prisma.instansi.findMany({
    where: filterMilik(user),
    orderBy: { namaInstansi: "asc" },
    include: { _count: { select: { alat: true, laporan: true } } },
  });

  return (
    <div>
      <JudulHalaman
        judul="Instansi / Klien"
        keterangan="Data bersama — sekali diinput, bisa dipakai semua Fismed untuk kalibrasi berikutnya."
        aksi={
          <Link href="/instansi/baru" className="tombol tombol-utama">
            + Tambah Instansi
          </Link>
        }
      />

      {error === "terlarang" && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Data tersebut bukan milik Anda, jadi tidak bisa dihapus.
        </p>
      )}

      {error === "terpakai" && (
        <p className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Instansi tidak bisa dihapus karena masih dipakai oleh laporan tersimpan.
        </p>
      )}

      <div className="kartu overflow-hidden">
        {daftar.length === 0 ? (
          <KosongPesan>Belum ada data instansi.</KosongPesan>
        ) : (
          <TabelGulir>
            <table className="tabel-data">
              <thead>
                <tr>
                  <th>Instansi / Fasilitas</th>
                  <th>Kota</th>
                  <th>PPR</th>
                  <th className="text-center">Alat</th>
                  <th className="text-center">Laporan</th>
                  <th className="w-40"></th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <span className="block font-medium">{i.namaInstansi}</span>
                      {i.namaFasilitas && (
                        <span className="text-xs text-[var(--muted)]">{i.namaFasilitas}</span>
                      )}
                    </td>
                    <td>{i.kota ?? "-"}</td>
                    <td>{i.namaPPR ?? "-"}</td>
                    <td className="text-center">{i._count.alat}</td>
                    <td className="text-center">{i._count.laporan}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link href={`/instansi/${i.id}`} className="tombol tombol-sekunder">
                          Ubah
                        </Link>
                        <form action={hapusInstansi}>
                          <input type="hidden" name="id" value={i.id} />
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
          </TabelGulir>
        )}
      </div>
    </div>
  );
}
