import Link from "next/link";
import { notFound } from "next/navigation";
import { hapusAkun } from "@/app/actions/pengguna";
import { KosongPesan } from "@/components/field";
import { pastikanAdmin } from "@/lib/akses";
import { tanggalPanjang } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { emailMaster, labelPeran } from "@/lib/peran";
import { namaJenisAlat } from "@/lib/templates";

const PESAN_HAPUS: Record<string, string> = {
  konfirmasi: "Email konfirmasi tidak cocok. Akun tidak jadi dihapus.",
  "hapus-diri-sendiri": "Akun sendiri tidak bisa dihapus dari halaman ini.",
  "hapus-master":
    "Akun master tidak bisa dihapus. Keluarkan dulu emailnya dari MASTER_EMAILS di pengaturan hosting.",
};

export default async function LaporanFismed({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  pastikanAdmin(user);

  const { id } = await params;
  const { error } = await searchParams;
  const pesanGagal = PESAN_HAPUS[error ?? ""];

  const fismed = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { laporan: true } },
    },
  });
  if (!fismed) notFound();

  const [laporan, jumlahInstansi, jumlahAlat, jumlahAlatUkur] = await Promise.all([
    prisma.laporan.findMany({
      where: { userId: id },
      orderBy: { tanggalUji: "desc" },
      include: { instansi: true, alatRadiologi: true },
    }),
    prisma.instansi.count({ where: { createdById: id } }),
    prisma.alatRadiologi.count({ where: { createdById: id } }),
    prisma.alatUkur.count({ where: { createdById: id } }),
  ]);

  const diriSendiri = fismed.id === user.id;
  const targetMaster = fismed.peran === "master" || emailMaster(fismed.email);
  const bolehHapus = user.master && !diriSendiri && !targetMaster;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            {fismed.nama}
            {fismed.gelar ? `, ${fismed.gelar}` : ""}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {fismed.email} · {targetMaster ? "Master" : labelPeran(fismed.peran)} ·
            bergabung{" "}
            {tanggalPanjang(fismed.createdAt)}
          </p>
        </div>
        <Link href="/profil/fismed" className="tombol tombol-sekunder">
          ← Kembali ke daftar
        </Link>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Angka label="Laporan" nilai={fismed._count.laporan} />
        <Angka label="Instansi / klien" nilai={jumlahInstansi} />
        <Angka label="Alat radiologi" nilai={jumlahAlat} />
      </div>

      <div className="kartu overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h3 className="text-sm font-semibold">Laporan yang telah dikalibrasi</h3>
        </div>
        {laporan.length === 0 ? (
          <KosongPesan>Fismed ini belum membuat laporan.</KosongPesan>
        ) : (
          <table className="tabel-data">
            <thead>
              <tr>
                <th>Nomor Laporan</th>
                <th>Instansi</th>
                <th>Jenis Alat</th>
                <th>Tanggal Uji</th>
                <th>Status</th>
                <th className="w-40"></th>
              </tr>
            </thead>
            <tbody>
              {laporan.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium">{l.nomorLaporan || "(tanpa nomor)"}</td>
                  <td>{l.instansi.namaInstansi}</td>
                  <td>{namaJenisAlat(l.jenisAlat)}</td>
                  <td>{tanggalPanjang(l.tanggalUji)}</td>
                  <td>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        l.status === "selesai"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {l.status === "selesai" ? "Selesai" : "Draf"}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link href={`/laporan/${l.id}`} className="tombol tombol-sekunder">
                        Buka
                      </Link>
                      <Link
                        href={`/laporan/${l.id}/cetak`}
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
        )}
      </div>

      <p className="mt-3 text-xs text-[var(--muted)]">
        Membuka laporan Fismed lain tidak memindahkan kepemilikannya — nama Fismed
        pembuatnya tetap yang tercetak di kolom tanda tangan.
      </p>

      {/* ---------- Hapus akun ---------- */}
      {bolehHapus && (
        <div className="kartu mt-8 border-red-300 p-5">
          <h3 className="text-sm font-semibold text-red-800">Hapus akun</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Menghapus akun <strong>{fismed.email}</strong> beserta{" "}
            <strong>{fismed._count.laporan} laporan</strong>, {jumlahInstansi} instansi,{" "}
            {jumlahAlat} alat radiologi, dan {jumlahAlatUkur} alat ukur miliknya.
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Data yang masih dipakai laporan Fismed lain tidak ikut dihapus, melainkan
            dialihkan kepemilikannya kepada Anda. <strong>Tindakan ini permanen</strong>{" "}
            dan tidak bisa dibatalkan.
          </p>

          {pesanGagal && (
            <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {pesanGagal}
            </p>
          )}

          <form action={hapusAkun} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={fismed.id} />
            <label className="min-w-64 flex-1">
              <span className="mb-1 block text-sm font-medium">
                Ketik <span className="font-mono">{fismed.email}</span> untuk konfirmasi
              </span>
              <input
                name="konfirmasi"
                required
                autoComplete="off"
                placeholder={fismed.email}
                className="input-dasar"
              />
            </label>
            <button type="submit" className="tombol tombol-bahaya">
              Hapus akun ini
            </button>
          </form>
        </div>
      )}

      {!bolehHapus && (
        <p className="mt-8 text-xs text-[var(--muted)]">
          {diriSendiri
            ? "Ini akun Anda sendiri, jadi tidak bisa dihapus dari sini."
            : targetMaster
              ? "Akun master tidak bisa dihapus dari sini — perannya berasal dari MASTER_EMAILS di pengaturan hosting."
              : "Penghapusan akun hanya tersedia untuk master."}
        </p>
      )}
    </div>
  );
}

function Angka({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="kartu p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{nilai}</p>
    </div>
  );
}
