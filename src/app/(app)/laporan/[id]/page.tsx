import Link from "next/link";
import { notFound } from "next/navigation";
import { hapusLaporan } from "@/app/actions/laporan";
import { JudulHalaman } from "@/components/field";
import { filterMilik, pastikanBoleh } from "@/lib/akses";
import { tanggalInput } from "@/lib/format";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTemplate } from "@/lib/templates";
import { normalisasiHasil } from "@/lib/templates/types";
import { tanggalPanjang } from "@/lib/format";
import { FormLaporan } from "./form";

export default async function HalamanLaporan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [laporan, alatUkur] = await Promise.all([
    prisma.laporan.findUnique({
      where: { id },
      include: {
        instansi: true,
        alatRadiologi: true,
        alatUkur: { orderBy: { urutan: "asc" } },
      },
    }),
    prisma.alatUkur.findMany({
      where: filterMilik(user),
      orderBy: { nama: "asc" },
    }),
  ]);

  if (!laporan) notFound();
  pastikanBoleh(user, laporan.userId);

  const template = getTemplate(laporan.jenisAlat);
  if (!template) {
    return (
      <div className="kartu p-6">
        <p className="text-sm">
          Template untuk jenis alat <strong>{laporan.jenisAlat}</strong> belum tersedia di
          versi ini.
        </p>
      </div>
    );
  }

  const sekarang = new Date();

  return (
    <div>
      <JudulHalaman
        judul={`Laporan Kalibrasi — ${template.nama}`}
        keterangan={`${laporan.instansi.namaInstansi} · ${
          laporan.alatRadiologi.namaAlat ?? laporan.alatRadiologi.model ?? "-"
        } · Uji ${tanggalPanjang(laporan.tanggalUji)}`}
        aksi={
          <div className="flex gap-2">
            <Link href={`/laporan/${laporan.id}/cetak`} className="tombol tombol-sekunder">
              Pratinjau &amp; Export PDF
            </Link>
            <form action={hapusLaporan}>
              <input type="hidden" name="id" value={laporan.id} />
              <button type="submit" className="tombol tombol-bahaya">
                Hapus
              </button>
            </form>
          </div>
        }
      />

      <FormLaporan
        laporan={{
          id: laporan.id,
          jenisAlat: laporan.jenisAlat,
          nomorLaporan: laporan.nomorLaporan,
          nomorOrder: laporan.nomorOrder,
          tanggalUjiInput: tanggalInput(laporan.tanggalUji),
          tanggalTerbitInput: tanggalInput(laporan.tanggalTerbit),
          lokasiUji: laporan.lokasiUji,
          metodeKerja: laporan.metodeKerja,
          kesimpulan: laporan.kesimpulan,
          catatan: laporan.catatan,
          rekomendasi: laporan.rekomendasi,
          status: laporan.status,
          hasilUji: normalisasiHasil(template, parseJson(laporan.hasilUji, {})),
          alatUkurTerpilih: laporan.alatUkur.map((x) => x.alatUkurId),
        }}
        alatUkur={alatUkur.map((a) => ({
          id: a.id,
          nama: a.nama,
          merek: a.merek,
          modelTipe: a.modelTipe,
          noSeri: a.noSeri,
          kadaluarsa: a.masaKalibrasiSampai !== null && a.masaKalibrasiSampai < sekarang,
          masaKalibrasiTeks: tanggalPanjang(a.masaKalibrasiSampai),
        }))}
      />
    </div>
  );
}
