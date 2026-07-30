import { requireUser } from "@/lib/session";
import { FormProfil } from "./form";

export default async function HalamanProfil() {
  const user = await requireUser();

  return (
    <div className="max-w-xl">
      <p className="mb-4 text-sm text-[var(--muted)]">
        Nama, gelar, dan NIP di sini yang tercetak pada kolom tanda tangan laporan.
      </p>
      <FormProfil
        user={{ nama: user.nama, gelar: user.gelar, nip: user.nip, email: user.email }}
      />
    </div>
  );
}
