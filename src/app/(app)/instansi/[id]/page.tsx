import { notFound } from "next/navigation";
import { JudulHalaman } from "@/components/field";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { FormInstansi } from "../form";

export default async function UbahInstansi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const instansi = await prisma.instansi.findUnique({ where: { id } });
  if (!instansi) notFound();

  return (
    <div className="max-w-3xl">
      <JudulHalaman judul="Ubah Instansi / Klien" keterangan={instansi.namaInstansi} />
      <FormInstansi instansi={instansi} />
    </div>
  );
}
