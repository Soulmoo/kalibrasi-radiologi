import Link from "next/link";
import { JudulHalaman, KosongPesan, TabelGulir } from "@/components/field";
import { filterAudit } from "@/lib/akses";
import { labelMetode, labelStatusAudit, terkunciAudit, RUTE_AUDIT } from "@/lib/audit-dosis";
import { tanggalPanjang } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { MODALITAS_AUDIT, namaModalitasAudit } from "@/lib/tpdi";
import type { Prisma } from "@prisma/client";

export default async function HalamanAuditDosis({
  searchParams,
}: {
  searchParams: Promise<{ modalitas?: string; error?: string; ok?: string }>;
}) {
  const user = await requireUser();
  const { modalitas, error, ok } = await searchParams;

  // Seperti daftar laporan: hanya milik sendiri. Audit Fismed lain dibuka admin
  // lewat Profil → Fismed, bukan dari daftar ini.
  const where: Prisma.AuditDosisWhereInput = { ...filterAudit(user) };
  if (modalitas) where.modalitas = modalitas;

  // Seperti daftar laporan: hanya kolom yang benar-benar digambar. `include`
  // penuh akan menarik `dataPasien` (seluruh baris pasien satu audit) dan
  // `parameter` untuk seratus audit sekaligus, tanpa ada yang menampilkannya.
  const daftar = await prisma.auditDosis.findMany({
    where,
    orderBy: { periodeMulai: "desc" },
    select: {
      id: true,
      modalitas: true,
      periodeMulai: true,
      periodeSelesai: true,
      metode: true,
      status: true,
      instansi: { select: { namaInstansi: true, namaFasilitas: true } },
      alatRadiologi: { select: { namaAlat: true, model: true, lokasiUnit: true } },
    },
    take: 100,
  });

  return (
    <div>
      <JudulHalaman
        judul="Audit Dosis Pasien"
        keterangan="Perbandingan dosis pasien terhadap Tingkat Panduan Diagnostik Indonesia (TPDI). Wajib dievaluasi minimal sekali setahun."
        aksi={
          <Link href={`${RUTE_AUDIT}/baru`} className="tombol tombol-utama">
            + Audit Baru
          </Link>
        }
      />

      {error === "terkunci" && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Audit yang sudah disimpan permanen tidak dapat dihapus. Hubungi master bila
          benar-benar perlu dihapus.
        </p>
      )}
      {ok === "hapus" && (
        <p className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Audit dihapus.
        </p>
      )}

      <form className="kartu mb-4 flex flex-wrap items-end gap-3 p-4">
        <label>
          <span className="mb-1 block text-sm font-medium">Modalitas</span>
          <select name="modalitas" defaultValue={modalitas ?? ""} className="input-dasar">
            <option value="">Semua</option>
            {MODALITAS_AUDIT.map((m) => (
              <option key={m.key} value={m.key}>
                {m.nama}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="tombol tombol-sekunder">
          Saring
        </button>
        {modalitas && (
          <Link href={RUTE_AUDIT} className="tombol tombol-sekunder">
            Reset
          </Link>
        )}
      </form>

      <div className="kartu overflow-hidden">
        {daftar.length === 0 ? (
          <KosongPesan>
            Belum ada audit dosis. Mulai dari tombol <strong>+ Audit Baru</strong>.
          </KosongPesan>
        ) : (
          <TabelGulir>
            <table className="tabel-data">
              <thead>
                <tr>
                  <th>Instansi</th>
                  <th>Modalitas</th>
                  <th>Alat</th>
                  <th>Periode</th>
                  <th>Jalur Data</th>
                  <th>Status</th>
                  <th className="w-40"></th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="block font-medium">{a.instansi.namaInstansi}</span>
                      {a.instansi.namaFasilitas && (
                        <span className="text-xs text-[var(--muted)]">
                          {a.instansi.namaFasilitas}
                        </span>
                      )}
                    </td>
                    <td>{namaModalitasAudit(a.modalitas)}</td>
                    <td>
                      {a.alatRadiologi.namaAlat ?? a.alatRadiologi.model ?? "-"}
                      {a.alatRadiologi.lokasiUnit && (
                        <span className="block text-xs text-[var(--muted)]">
                          {a.alatRadiologi.lokasiUnit}
                        </span>
                      )}
                    </td>
                    <td>
                      {tanggalPanjang(a.periodeMulai)} –{" "}
                      {tanggalPanjang(a.periodeSelesai)}
                    </td>
                    <td className="text-xs">{labelMetode(a.metode)}</td>
                    <td>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          terkunciAudit(a.status)
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {labelStatusAudit(a.status)}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`${RUTE_AUDIT}/${a.id}`}
                          className="tombol tombol-sekunder"
                        >
                          Buka
                        </Link>
                        <Link
                          href={`${RUTE_AUDIT}/${a.id}/cetak`}
                          className="tombol tombol-sekunder"
                        >
                          PDF
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelGulir>
        )}
      </div>
    </div>
  );
}
