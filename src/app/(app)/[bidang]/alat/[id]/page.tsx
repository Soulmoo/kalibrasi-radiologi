import { notFound, redirect } from "next/navigation";
import { JudulHalaman } from "@/components/field";
import { filterMilik, pastikanBolehUbah } from "@/lib/akses";
import { pastikanBidang, rute } from "@/lib/bidang";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { parseJson } from "@/lib/json";
import { bidangDariJenisAlat } from "@/lib/templates";
import { FormAlat } from "../form";

export default async function UbahAlat({
  params,
}: {
  params: Promise<{ bidang: string; id: string }>;
}) {
  const user = await requireUser();
  const { bidang: segmen, id } = await params;
  const bidang = pastikanBidang(segmen);

  const [alat, instansi] = await Promise.all([
    prisma.alatRadiologi.findUnique({ where: { id } }),
    prisma.instansi.findMany({
      where: filterMilik(user),
      orderBy: { namaInstansi: "asc" },
      select: { id: true, namaInstansi: true, namaFasilitas: true },
    }),
  ]);

  if (!alat) notFound();
  pastikanBolehUbah(user, alat.createdById);
  const bidangAlat = bidangDariJenisAlat(alat.jenisAlat);
  if (bidangAlat !== bidang.key) redirect(rute(bidangAlat, `/alat/${id}`));

  return (
    <div className="max-w-4xl">
      <JudulHalaman judul={`Ubah ${bidang.labelAlat}`} keterangan={alat.namaAlat ?? undefined} />
      <FormAlat
        bidang={bidang.key}
        instansi={instansi}
        alat={{
          id: alat.id,
          instansiId: alat.instansiId,
          jenisAlat: alat.jenisAlat,
          namaAlat: alat.namaAlat,
          lokasiUnit: alat.lokasiUnit,
          merk: alat.merk,
          model: alat.model,
          noSeri: alat.noSeri,
          tahunProduksi: alat.tahunProduksi,
          konfigurasi: parseJson<Record<string, string | string[]>>(alat.konfigurasi, {}),
        }}
      />
    </div>
  );
}
