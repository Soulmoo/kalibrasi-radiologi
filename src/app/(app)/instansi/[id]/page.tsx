import { notFound } from "next/navigation";
import { JudulHalaman } from "@/components/field";
import { pastikanBoleh } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { FormInstansi } from "../form";

export default async function UbahInstansi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const instansi = await prisma.instansi.findUnique({ where: { id } });
  if (!instansi) notFound();
  pastikanBoleh(user, instansi.createdById);

  return (
    <div className="max-w-3xl">
      <JudulHalaman judul="Ubah Instansi / Klien" keterangan={instansi.namaInstansi} />
      <FormInstansi instansi={instansi} />
    </div>
  );
}
