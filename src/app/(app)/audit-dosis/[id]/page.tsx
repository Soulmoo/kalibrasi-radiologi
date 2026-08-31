import Link from "next/link";
import { notFound } from "next/navigation";
import { hapusAudit } from "@/app/actions/audit-dosis";
import { JudulHalaman } from "@/components/field";
import { bolehUbah, pastikanBolehLihat } from "@/lib/akses";
import {
  type BarisPasien,
  type MetodeAudit,
  type ParameterAudit,
  labelMetode,
  parameterDefault,
  terkunciAudit,
} from "@/lib/audit-dosis";
import { namaLengkap, tanggalInput, tanggalPanjang } from "@/lib/format";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { ModalitasAudit } from "@/lib/tpdi";
import { namaModalitasAudit } from "@/lib/tpdi";
import { AuditBacaSaja } from "./baca";
import { FormAudit } from "./form";

export default async function HalamanAudit({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { ok, error } = await searchParams;

  const audit = await prisma.auditDosis.findUnique({
    where: { id },
    include: { instansi: true, alatRadiologi: true, user: true },
  });

  if (!audit) notFound();
  pastikanBolehLihat(user, audit.userId);

  // Dua sebab form sunting tidak dirender, dan keduanya ditolak ulang di server
  // action simpanAudit — menyembunyikan form saja tidak mengunci apa pun.
  const dikunci = terkunciAudit(audit.status);
  const pemilik = bolehUbah(user, audit.userId);
  const bisaUbah = pemilik && !dikunci;

  const modalitas = audit.modalitas as ModalitasAudit;
  const metode = audit.metode as MetodeAudit;
  const parameter = parseJson<ParameterAudit>(audit.parameter, parameterDefault());
  const rows = parseJson<BarisPasien[]>(audit.dataPasien, []);
  const namaAlat = audit.alatRadiologi.namaAlat ?? audit.alatRadiologi.model ?? "-";

  const judul = (
    <JudulHalaman
      judul={`Audit Dosis — ${namaModalitasAudit(audit.modalitas)}`}
      keterangan={`${audit.instansi.namaInstansi} · ${namaAlat} · ${tanggalPanjang(
        audit.periodeMulai,
      )} – ${tanggalPanjang(audit.periodeSelesai)} · ${labelMetode(audit.metode)}`}
      aksi={
        <div className="flex gap-2">
          <Link href={`/audit-dosis/${audit.id}/cetak`} className="tombol tombol-sekunder">
            Pratinjau &amp; Export PDF
          </Link>
          {/* Audit terkunci hanya boleh dihapus master — lihat hapusAudit. */}
          {(dikunci ? user.master : pemilik) && (
            <form action={hapusAudit}>
              <input type="hidden" name="id" value={audit.id} />
              <button type="submit" className="tombol tombol-bahaya">
                Hapus
              </button>
            </form>
          )}
        </div>
      }
    />
  );

  const pesan = (
    <>
      {ok === "identitas-dihapus" && (
        <p className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Identitas pasien dihapus. Angka dosis, umur, dan berat badan tetap utuh sehingga
          nilai tipikalnya tidak berubah.
        </p>
      )}
      {error === "belum-permanen" && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Identitas hanya bisa dihapus setelah audit disimpan permanen.
        </p>
      )}
      {error === "bukan-milik" && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Audit ini milik Fismed lain dan hanya bisa dibuka baca-saja.
        </p>
      )}
    </>
  );

  if (!bisaUbah) {
    return (
      <div>
        {judul}
        {pesan}
        <AuditBacaSaja
          rows={rows}
          modalitas={modalitas}
          metode={metode}
          parameter={parameter}
          pemilik={namaLengkap(audit.user)}
          alasan={dikunci ? "terkunci" : "lintas-fismed"}
          catatan={audit.catatan}
          bolehHapusIdentitas={pemilik && dikunci}
          auditId={audit.id}
        />
      </div>
    );
  }

  return (
    <div>
      {judul}
      {pesan}
      <FormAudit
        audit={{
          id: audit.id,
          modalitas,
          metode,
          parameter,
          periodeMulaiInput: tanggalInput(audit.periodeMulai),
          periodeSelesaiInput: tanggalInput(audit.periodeSelesai),
          catatan: audit.catatan,
          rows,
        }}
      />
    </div>
  );
}
