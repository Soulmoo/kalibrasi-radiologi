import Link from "next/link";
import { JudulHalaman } from "@/components/field";
import { filterMilik } from "@/lib/akses";
import { modalitasAuditDariJenisAlat, titikKeluaranDariHasil } from "@/lib/audit-dosis";
import { regresiPangkat } from "@/lib/calc";
import { tanggalPanjang } from "@/lib/format";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { namaJenisAlat } from "@/lib/templates";
import { FormAuditBaru } from "./form";

export default async function AuditBaru() {
  const user = await requireUser();

  // Hanya modalitas yang sudah punya TPDI nasional. Alat lain sengaja tidak
  // ditawarkan supaya Fismed tidak membuat audit yang tidak punya pembanding.
  const alat = await prisma.alatRadiologi.findMany({
    where: { ...filterMilik(user), jenisAlat: { in: ["radiografi-mobile", "ct-scan"] } },
    orderBy: [{ instansi: { namaInstansi: "asc" } }, { jenisAlat: "asc" }],
    include: { instansi: true },
  });

  // Laporan kalibrasi yang bisa jadi sumber data keluaran radiasi (Jalur B).
  // Dibatasi ke laporan milik sendiri yang sudah disimpan permanen — data uji
  // yang masih draf bisa berubah, sedangkan regresi dibekukan saat audit dibuat.
  const laporan = await prisma.laporan.findMany({
    where: {
      userId: user.id,
      status: "selesai",
      alatRadiologiId: { in: alat.map((a) => a.id) },
    },
    orderBy: { tanggalUji: "desc" },
    select: { id: true, alatRadiologiId: true, nomorLaporan: true, tanggalUji: true, hasilUji: true },
  });

  return (
    <div className="max-w-3xl">
      <JudulHalaman
        judul="Audit Dosis Baru"
        keterangan="Pilih alat dan periode, lalu tentukan dari mana angka dosis pasien diambil."
      />

      {alat.length === 0 ? (
        <div className="kartu p-6 text-sm">
          <p>Belum ada alat radiologi yang bisa diaudit dosisnya.</p>
          <p className="mt-2 text-[var(--muted)]">
            TPDI nasional (Kepka BAPETEN No. 1211/K/V/2021) baru tersedia untuk{" "}
            <strong>radiografi umum/mobile</strong> dan <strong>CT-Scan</strong>. Daftarkan
            alat jenis tersebut di{" "}
            <Link href="/alat/baru" className="text-[var(--brand)] hover:underline">
              Alat Radiologi
            </Link>{" "}
            terlebih dahulu.
          </p>
        </div>
      ) : (
        <FormAuditBaru
          alat={alat.map((a) => ({
            id: a.id,
            label:
              `${a.instansi.namaInstansi} — ${namaJenisAlat(a.jenisAlat)}` +
              (a.namaAlat ? ` — ${a.namaAlat}` : "") +
              (a.lokasiUnit ? ` (${a.lokasiUnit})` : ""),
            modalitas: modalitasAuditDariJenisAlat(a.jenisAlat)!,
          }))}
          laporan={laporan.map((l) => {
            // Pratinjau regresi dihitung di server supaya Fismed tahu sejak
            // awal apakah laporan itu benar-benar punya data keluaran radiasi
            // yang memadai — kegagalannya jadi terlihat sebelum tombol ditekan.
            const reg = regresiPangkat(
              titikKeluaranDariHasil(parseJson<Record<string, unknown>>(l.hasilUji, {})),
            );
            return {
              id: l.id,
              alatRadiologiId: l.alatRadiologiId,
              label: `${l.nomorLaporan || "(tanpa nomor)"} · Uji ${tanggalPanjang(l.tanggalUji)}`,
              regresi: reg
                ? { a: reg.a, n: reg.n, r2: reg.r2, titik: reg.titik }
                : null,
            };
          })}
        />
      )}
    </div>
  );
}
