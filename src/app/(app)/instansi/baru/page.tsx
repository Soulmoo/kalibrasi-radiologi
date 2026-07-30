import { JudulHalaman } from "@/components/field";
import { requireUser } from "@/lib/session";
import { FormInstansi } from "../form";

export default async function TambahInstansi() {
  await requireUser();
  return (
    <div className="max-w-3xl">
      <JudulHalaman judul="Tambah Instansi / Klien" />
      <FormInstansi />
    </div>
  );
}
