import { notFound } from "next/navigation";
import { JudulHalaman } from "@/components/field";
import { filterMilik, pastikanBolehUbah } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { parseJson } from "@/lib/json";
import { FormAlat } from "../form";

export default async function UbahAlat({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

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

  return (
    <div className="max-w-4xl">
      <JudulHalaman judul="Ubah Alat Radiologi" keterangan={alat.namaAlat ?? undefined} />
      <FormAlat
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
