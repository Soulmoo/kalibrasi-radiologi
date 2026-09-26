import { JudulHalaman } from "@/components/field";
import { filterMilik } from "@/lib/akses";
import { pastikanBidang } from "@/lib/bidang";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { FormAlat } from "../form";

export default async function TambahAlat({
  params,
}: {
  params: Promise<{ bidang: string }>;
}) {
  const user = await requireUser();
  const bidang = pastikanBidang((await params).bidang);
  const instansi = await prisma.instansi.findMany({
    where: filterMilik(user),
    orderBy: { namaInstansi: "asc" },
    select: { id: true, namaInstansi: true, namaFasilitas: true },
  });

  return (
    <div className="max-w-4xl">
      <JudulHalaman judul={`Tambah ${bidang.labelAlat}`} />
      <FormAlat bidang={bidang.key} instansi={instansi} />
    </div>
  );
}
