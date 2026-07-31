import Link from "next/link";
import { hapusAlatUkur } from "@/app/actions/master";
import { JudulHalaman, KosongPesan, TabelGulir } from "@/components/field";
import { filterMilik } from "@/lib/akses";
import { tanggalPanjang } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function HalamanAlatUkur({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;
  const daftar = await prisma.alatUkur.findMany({
    where: filterMilik(user),
    orderBy: { nama: "asc" },
  });
  const sekarang = new Date();

  return (
    <div>
      <JudulHalaman
        judul="Registry Alat Ukur"
        keterangan="Dipakai berulang lintas laporan — thermohygrobarometer, multimeter, dose probe, phantom, dan lainnya."
        aksi={
          <Link href="/alat-ukur/baru" className="tombol tombol-utama">
            + Tambah Alat Ukur
          </Link>
        }
      />

      {error === "terlarang" && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Alat ukur tersebut bukan milik Anda, jadi tidak bisa dihapus.
        </p>
      )}

      <div className="kartu overflow-hidden">
        {daftar.length === 0 ? (
          <KosongPesan>Belum ada alat ukur terdaftar.</KosongPesan>
        ) : (
          <TabelGulir>
            <table className="tabel-data">
              <thead>
                <tr>
                  <th>Nama Alat</th>
                  <th>Merek</th>
                  <th>Model / Tipe</th>
                  <th>Nomor Seri</th>
                  <th>Tertelusur ke</th>
                  <th>Masa Kalibrasi s/d</th>
                  <th className="w-40"></th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((a) => {
                  const lewat =
                    a.masaKalibrasiSampai !== null && a.masaKalibrasiSampai < sekarang;
                  return (
                    <tr key={a.id}>
                      <td className="font-medium">{a.nama}</td>
                      <td>{a.merek ?? "-"}</td>
                      <td>{a.modelTipe ?? "-"}</td>
                      <td>{a.noSeri ?? "-"}</td>
                      <td>{a.tertelusurKe ?? "-"}</td>
                      <td className={lewat ? "text-amber-700" : undefined}>
                        {tanggalPanjang(a.masaKalibrasiSampai)}
                        {lewat && <span className="ml-1 text-xs">(terlewat)</span>}
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Link href={`/alat-ukur/${a.id}`} className="tombol tombol-sekunder">
                            Ubah
                          </Link>
                          <form action={hapusAlatUkur}>
                            <input type="hidden" name="id" value={a.id} />
                            <button type="submit" className="tombol tombol-bahaya">
                              Hapus
                            </button>
                          </form>
                        </div>
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
