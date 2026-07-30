import { JudulHalaman } from "@/components/field";
import { requireUser } from "@/lib/session";
import { FormAlatUkur } from "../form";

export default async function TambahAlatUkur() {
  await requireUser();
  return (
    <div className="max-w-3xl">
      <JudulHalaman judul="Tambah Alat Ukur" />
      <FormAlatUkur />
    </div>
  );
}
