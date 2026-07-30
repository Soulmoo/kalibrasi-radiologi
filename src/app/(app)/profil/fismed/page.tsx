import Link from "next/link";
import { ubahPeran } from "@/app/actions/pengguna";
import { KosongPesan } from "@/components/field";
import { pastikanAdmin } from "@/lib/akses";
import { tanggalPanjang } from "@/lib/format";
import { emailMaster, labelPeran } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const PESAN: Record<string, { teks: string; nada: "ok" | "salah" }> = {
  peran: { teks: "Peran akun berhasil diperbarui.", nada: "ok" },
  hapus: { teks: "Akun beserta datanya berhasil dihapus.", nada: "ok" },
  "diri-sendiri": {
    teks: "Peran akun sendiri tidak bisa diubah dari sini.",
    nada: "salah",
  },
  "tidak-ada": { teks: "Akun tidak ditemukan.", nada: "salah" },
  master: {
    teks:
      "Akun master tidak bisa diubah dari sini. Perannya berasal dari environment " +
      "variable MASTER_EMAILS — keluarkan dulu emailnya dari daftar itu di pengaturan hosting.",
    nada: "salah",
  },
};

const WARNA_PERAN: Record<string, string> = {
  master: "bg-[var(--brand)] text-white",
  admin: "bg-[var(--brand-soft)] text-[var(--brand)]",
  fismed: "bg-gray-100 text-gray-700",
};

export default async function HalamanFismed({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireUser();
  pastikanAdmin(user);

  const { ok, error } = await searchParams;
  const pesan = PESAN[ok ?? error ?? ""];

  const daftar = await prisma.user.findMany({
    orderBy: [{ peran: "asc" }, { nama: "asc" }],
    include: { _count: { select: { laporan: true } } },
  });

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Seluruh akun yang terdaftar. Klik salah satu untuk melihat laporan yang sudah
        dikalibrasi Fismed tersebut.
      </p>

      {pesan && (
        <p
          className={`mb-4 rounded border px-3 py-2 text-sm ${
            pesan.nada === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <div className="kartu overflow-hidden">
        {daftar.length === 0 ? (
          <KosongPesan>Belum ada akun terdaftar.</KosongPesan>
        ) : (
          <table className="tabel-data">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th className="text-center">Laporan</th>
                <th>Bergabung</th>
                <th>Peran</th>
                {user.master && <th className="w-32"></th>}
              </tr>
            </thead>
            <tbody>
              {daftar.map((u) => {
                const diriSendiri = u.id === user.id;
                // Email yang terdaftar di MASTER_EMAILS dianggap master walau
                // kolom perannya belum tersinkron — sinkronisasi terjadi saat
                // akun itu login berikutnya.
                const targetMaster = u.peran === "master" || emailMaster(u.email);
                return (
                  <tr key={u.id}>
                    <td>
                      <Link
                        href={`/profil/fismed/${u.id}`}
                        className="font-medium text-[var(--brand)] hover:underline"
                      >
                        {u.nama}
                        {u.gelar ? `, ${u.gelar}` : ""}
                      </Link>
                      {diriSendiri && (
                        <span className="ml-2 text-xs text-[var(--muted)]">(Anda)</span>
                      )}
                    </td>
                    <td>{u.email}</td>
                    <td className="text-center">{u._count.laporan}</td>
                    <td>{tanggalPanjang(u.createdAt)}</td>
                    <td>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          targetMaster
                            ? WARNA_PERAN.master
                            : (WARNA_PERAN[u.peran] ?? WARNA_PERAN.fismed)
                        }`}
                      >
                        {targetMaster ? "Master" : labelPeran(u.peran)}
                      </span>
                    </td>
                    {user.master && (
                      <td>
                        {diriSendiri || targetMaster ? (
                          <span className="block text-right text-xs text-[var(--muted)]">
                            {targetMaster ? "terkunci" : "—"}
                          </span>
                        ) : (
                          <form action={ubahPeran} className="flex justify-end">
                            <input type="hidden" name="id" value={u.id} />
                            <input
                              type="hidden"
                              name="peran"
                              value={u.peran === "admin" ? "fismed" : "admin"}
                            />
                            <button type="submit" className="tombol tombol-sekunder">
                              {u.peran === "admin" ? "Turunkan" : "Jadikan Admin"}
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-3 space-y-1 text-xs text-[var(--muted)]">
        <p>
          <strong>Fismed</strong> hanya melihat data buatannya sendiri.{" "}
          <strong>Admin</strong> juga bisa membuka laporan seluruh Fismed.{" "}
          <strong>Master</strong> ditambah wewenang mengatur peran dan menghapus akun.
        </p>
        {user.master ? (
          <p>
            Peran master tidak bisa diberikan atau dicabut dari halaman ini — sumbernya
            environment variable MASTER_EMAILS di pengaturan hosting.
          </p>
        ) : (
          <p>Pengaturan peran dan penghapusan akun hanya tersedia untuk master.</p>
        )}
      </div>
    </div>
  );
}
