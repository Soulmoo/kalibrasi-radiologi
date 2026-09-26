import { JudulHalaman } from "@/components/field";
import { pastikanBidang } from "@/lib/bidang";
import { requireUser } from "@/lib/session";
import { FormAlatUkur } from "../form";

export default async function TambahAlatUkur({
  params,
}: {
  params: Promise<{ bidang: string }>;
}) {
  await requireUser();
  const bidang = pastikanBidang((await params).bidang);
  return (
    <div className="max-w-3xl">
      <JudulHalaman judul="Tambah Alat Ukur" />
      <FormAlatUkur bidang={bidang.key} />
    </div>
  );
}
