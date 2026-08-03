import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { FormProfil } from "./form";

export default async function HalamanProfil() {
  const user = await requireUser();

  // Gambar tanda tangan sengaja TIDAK ikut di dalam sesi — cookie sesi
  // dibatasi ~4 KB dan PNG base64 akan melewatinya, membuat cookie terpotong
  // dan seluruh Fismed ter-logout. Jadi kolom itu diambil langsung dari
  // database di sini.
  const baris = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tandaTanganGambar: true },
  });

  return (
    <div className="max-w-xl">
      <p className="mb-4 text-sm text-[var(--muted)]">
        Nama, gelar, NIP, dan tanda tangan di sini yang tercetak pada kolom tanda tangan
        laporan.
      </p>
      <FormProfil
        user={{
          nama: user.nama,
          gelar: user.gelar,
          nip: user.nip,
          email: user.email,
          tandaTanganGambar: baris?.tandaTanganGambar ?? null,
        }}
      />
    </div>
  );
}
