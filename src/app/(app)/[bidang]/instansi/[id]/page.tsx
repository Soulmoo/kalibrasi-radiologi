import { notFound } from "next/navigation";
import { JudulHalaman } from "@/components/field";
import { pastikanBolehUbah } from "@/lib/akses";
import { pastikanBidang } from "@/lib/bidang";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { FormInstansi } from "../form";

export default async function UbahInstansi({
  params,
}: {
  params: Promise<{ bidang: string; id: string }>;
}) {
  const user = await requireUser();
  const { bidang: segmen, id } = await params;
  const bidang = pastikanBidang(segmen);
  const instansi = await prisma.instansi.findUnique({ where: { id } });
  if (!instansi) notFound();
  pastikanBolehUbah(user, instansi.createdById);

  return (
    <div className="max-w-3xl">
      <JudulHalaman judul="Ubah Instansi / Klien" keterangan={instansi.namaInstansi} />
      <FormInstansi bidang={bidang.key} instansi={instansi} />
    </div>
  );
}
