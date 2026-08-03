import Link from "next/link";
import { notFound } from "next/navigation";
import { hapusLaporan } from "@/app/actions/laporan";
import { JudulHalaman } from "@/components/field";
import { bolehUbah, filterMilikPengguna, pastikanBolehLihat } from "@/lib/akses";
import { namaLengkap, tanggalInput, tanggalPanjang } from "@/lib/format";
import { terkunci } from "@/lib/laporan";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTemplate } from "@/lib/templates";
import { normalisasiHasil } from "@/lib/templates/types";
import { LaporanBacaSaja } from "./baca";
import { FormLaporan } from "./form";

export default async function HalamanLaporan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const laporan = await prisma.laporan.findUnique({
    where: { id },
    include: {
      instansi: true,
      alatRadiologi: true,
      user: true,
      alatUkur: { include: { alatUkur: true }, orderBy: { urutan: "asc" } },
    },
  });

  if (!laporan) notFound();
  pastikanBolehLihat(user, laporan.userId);

  // Dua sebab form sunting tidak dirender, dan keduanya juga ditolak ulang di
  // server action `simpanLaporan` — menyembunyikan form saja tidak mengunci
  // apa pun, karena server action bisa dipanggil lewat request langsung.
  //
  // 1. Admin & master boleh membuka laporan Fismed lain, tetapi tidak
  //    menyuntingnya: isinya hasil pengukuran yang sangat personal bagi Fismed
  //    yang mengerjakannya.
  // 2. Laporan yang sudah disimpan permanen tidak bisa disunting siapa pun,
  //    termasuk pemiliknya sendiri.
  const dikunci = terkunci(laporan.status);
  const bisaUbah = bolehUbah(user, laporan.userId) && !dikunci;

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
  const namaAlat =
    laporan.alatRadiologi.namaAlat ?? laporan.alatRadiologi.model ?? "-";
  const hasil = normalisasiHasil(template, parseJson(laporan.hasilUji, {}));

  const judul = (
    <JudulHalaman
      judul={`Laporan Kalibrasi — ${template.nama}`}
      keterangan={`${laporan.instansi.namaInstansi} · ${namaAlat} · Uji ${tanggalPanjang(
        laporan.tanggalUji,
      )}`}
      aksi={
        <div className="flex gap-2">
          <Link href={`/laporan/${laporan.id}/cetak`} className="tombol tombol-sekunder">
            Pratinjau &amp; Export PDF
          </Link>
          {/* Laporan terkunci hanya boleh dihapus master — lihat hapusLaporan. */}
          {(dikunci ? user.master : bolehUbah(user, laporan.userId)) && (
            <form action={hapusLaporan}>
              <input type="hidden" name="id" value={laporan.id} />
              <button type="submit" className="tombol tombol-bahaya">
                Hapus
              </button>
            </form>
          )}
        </div>
      }
    />
  );

  if (!bisaUbah) {
    return (
      <div>
        {judul}
        <LaporanBacaSaja
          template={template}
          hasil={hasil}
          pemilik={namaLengkap(laporan.user)}
          alasan={dikunci ? "terkunci" : "lintas-fismed"}
          laporan={{
            nomorLaporan: laporan.nomorLaporan,
            nomorOrder: laporan.nomorOrder,
            tanggalUji: laporan.tanggalUji,
            tanggalTerbit: laporan.tanggalTerbit,
            lokasiUji: laporan.lokasiUji,
            metodeKerja: laporan.metodeKerja,
            kesimpulan: laporan.kesimpulan,
            catatan: laporan.catatan,
            rekomendasi: laporan.rekomendasi,
            status: laporan.status,
            namaInstansi: laporan.instansi.namaInstansi,
            namaAlat,
            alatUkur: laporan.alatUkur.map(({ alatUkur: a }) => ({
              id: a.id,
              nama: a.nama,
              merek: a.merek,
              modelTipe: a.modelTipe,
              noSeri: a.noSeri,
              masaKalibrasiTeks: tanggalPanjang(a.masaKalibrasiSampai),
            })),
          }}
        />
      </div>
    );
  }

  // Registry alat ukur mengikuti pemilik laporan, bukan pengguna yang membuka —
  // supaya alat ukur yang sudah tercatat tidak hilang saat laporan disimpan.
  const alatUkur = await prisma.alatUkur.findMany({
    where: filterMilikPengguna(laporan.userId),
    orderBy: { nama: "asc" },
  });

  return (
    <div>
      {judul}

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
          hasilUji: hasil,
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
