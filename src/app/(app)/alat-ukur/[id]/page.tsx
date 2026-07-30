import { notFound } from "next/navigation";
import { JudulHalaman } from "@/components/field";
import { tanggalInput } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { FormAlatUkur } from "../form";

export default async function UbahAlatUkur({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const a = await prisma.alatUkur.findUnique({ where: { id } });
  if (!a) notFound();

  return (
    <div className="max-w-3xl">
      <JudulHalaman judul="Ubah Alat Ukur" keterangan={a.nama} />
      <FormAlatUkur
        alatUkur={{
          id: a.id,
          nama: a.nama,
          merek: a.merek,
          modelTipe: a.modelTipe,
          noSeri: a.noSeri,
          tertelusurKe: a.tertelusurKe,
          masaKalibrasiSampaiInput: tanggalInput(a.masaKalibrasiSampai),
        }}
      />
    </div>
  );
}
