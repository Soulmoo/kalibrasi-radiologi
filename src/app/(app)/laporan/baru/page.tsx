import Link from "next/link";
import { JudulHalaman } from "@/components/field";
import { filterMilik } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { namaJenisAlat } from "@/lib/templates";
import { FormLaporanBaru } from "./form";

export default async function LaporanBaru() {
  const user = await requireUser();

  const alat = await prisma.alatRadiologi.findMany({
    where: filterMilik(user),
    orderBy: [{ instansi: { namaInstansi: "asc" } }, { jenisAlat: "asc" }],
    include: { instansi: true },
  });

  return (
    <div className="max-w-3xl">
      <JudulHalaman
        judul="Laporan Kalibrasi Baru"
        keterangan="Pilih alat yang akan dikalibrasi — data instansi dan konfigurasi alat ikut otomatis."
      />

      {alat.length === 0 ? (
        <div className="kartu p-6 text-sm">
          <p>Belum ada alat radiologi terdaftar.</p>
          <p className="mt-2 text-[var(--muted)]">
            Tambahkan{" "}
            <Link href="/instansi/baru" className="text-[var(--brand)] hover:underline">
              instansi
            </Link>{" "}
            lalu{" "}
            <Link href="/alat/baru" className="text-[var(--brand)] hover:underline">
              alat radiologi
            </Link>{" "}
            terlebih dahulu.
          </p>
        </div>
      ) : (
        <FormLaporanBaru
          alat={alat.map((a) => ({
            id: a.id,
            label:
              `${a.instansi.namaInstansi} — ${namaJenisAlat(a.jenisAlat)}` +
              (a.namaAlat ? ` — ${a.namaAlat}` : "") +
              (a.lokasiUnit ? ` (${a.lokasiUnit})` : ""),
            lokasiUnit: a.lokasiUnit ?? "",
          }))}
        />
      )}
    </div>
  );
}
