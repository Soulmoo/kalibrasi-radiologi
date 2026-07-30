import { JudulHalaman } from "@/components/field";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { FormAlat } from "../form";

export default async function TambahAlat() {
  await requireUser();
  const instansi = await prisma.instansi.findMany({
    orderBy: { namaInstansi: "asc" },
    select: { id: true, namaInstansi: true, namaFasilitas: true },
  });

  return (
    <div className="max-w-4xl">
      <JudulHalaman judul="Tambah Alat Radiologi" />
      <FormAlat instansi={instansi} />
    </div>
  );
}
