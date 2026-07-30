import { JudulHalaman } from "@/components/field";
import { requireUser } from "@/lib/session";
import { FormProfil } from "./form";

export default async function HalamanProfil() {
  const user = await requireUser();

  return (
    <div className="max-w-xl">
      <JudulHalaman
        judul="Profil Fismed"
        keterangan="Nama, gelar, dan NIP di sini yang tercetak pada kolom tanda tangan laporan."
      />
      <FormProfil
        user={{ nama: user.nama, gelar: user.gelar, nip: user.nip, email: user.email }}
      />
    </div>
  );
}
