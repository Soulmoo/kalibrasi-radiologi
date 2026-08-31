import { hapusIdentitasPasien } from "@/app/actions/audit-dosis";
import { TabelGulir } from "@/components/field";
import { RekapAuditTabel, TindakLanjutAudit } from "@/components/rekap-audit";
import {
  type BarisPasien,
  MIN_PASIEN,
  type MetodeAudit,
  type ParameterAudit,
  hitungBarisPasien,
  kelompokkanAudit,
  rekapAudit,
} from "@/lib/audit-dosis";
import { fmt } from "@/lib/calc";
import { SUMBER_TPDI, type ModalitasAudit } from "@/lib/tpdi";
import { kolomPasien } from "./kolom";

export function AuditBacaSaja({
  rows,
  modalitas,
  metode,
  parameter,
  pemilik,
  alasan,
  catatan,
  bolehHapusIdentitas,
  auditId,
}: {
  rows: BarisPasien[];
  modalitas: ModalitasAudit;
  metode: MetodeAudit;
  parameter: ParameterAudit;
  pemilik: string;
  alasan: "terkunci" | "lintas-fismed";
  catatan: string | null;
  bolehHapusIdentitas: boolean;
  auditId: string;
}) {
  const grup = kelompokkanAudit(rows, modalitas, metode, parameter);
  const rekap = rekapAudit(grup, rows);

  // Identitas pasien tidak ditampilkan ke pengguna lintas-Fismed. Admin & master
  // boleh membuka audit orang lain untuk memeriksa hasilnya, tapi tidak punya
  // dasar untuk melihat siapa pasiennya — angka dan faktor eksposinya sudah
  // cukup untuk memverifikasi perhitungan.
  const tampilkanIdentitas = alasan === "terkunci";
  const kolom = kolomPasien(modalitas, metode).filter(
    (k) => tampilkanIdentitas || !k.identitas,
  );

  return (
    <div className="space-y-6">
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {alasan === "terkunci" ? (
          <>
            Audit ini sudah <strong>disimpan permanen</strong> dan tidak dapat diubah lagi
            oleh siapa pun, termasuk pemiliknya.
          </>
        ) : (
          <>
            Audit ini milik <strong>{pemilik}</strong> dan dibuka <strong>baca-saja</strong>.
            Identitas pasien tidak ditampilkan.
          </>
        )}
      </p>

      {/* ---------- Rekap ---------- */}
      <section className="kartu overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              Nilai Tipikal &amp; Pembandingan terhadap TPD Nasional
            </h2>
            <span className="text-xs text-[var(--muted)]">
              {rekap.totalPasien} data · {rekap.totalGrup} grup · {rekap.grupCukup} memenuhi
              syarat survei (≥ {MIN_PASIEN})
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">Sumber TPD nasional: {SUMBER_TPDI}</p>
        </div>

        <RekapAuditTabel grup={grup} desimal={modalitas === "ct-scan" ? 1 : 3} />

        {grup.length > 0 && (
          <div className="border-t border-[var(--border)] px-4 py-3">
            <h3 className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">
              Tindak lanjut yang diwajibkan
            </h3>
            <TindakLanjutAudit grup={grup} />
          </div>
        )}
      </section>

      {/* ---------- Data pasien ---------- */}
      <section className="kartu overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold">Data Pasien</h2>
          {bolehHapusIdentitas && (
            <form action={hapusIdentitasPasien}>
              <input type="hidden" name="id" value={auditId} />
              <button type="submit" className="tombol tombol-sekunder">
                Hapus identitas pasien
              </button>
            </form>
          )}
        </div>

        {bolehHapusIdentitas && (
          <p className="border-b border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
            Audit sudah terkunci, jadi identitas pasien tidak dibutuhkan lagi — yang
            dilaporkan ke BAPETEN adalah nilai tipikal per grup. Menghapusnya mengosongkan
            kode, nama, dan jenis kelamin; umur dan berat badan dipertahankan karena
            keduanya menentukan pengelompokan.
          </p>
        )}

        <TabelGulir>
          <table className="tabel-data">
            <thead>
              <tr>
                <th className="w-10">#</th>
                {kolom.map((k) => (
                  <th key={k.key}>
                    {k.label}
                    {k.satuan && (
                      <span className="block text-[10px] font-normal text-[var(--muted)]">
                        {k.satuan}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const hasil = hitungBarisPasien(r, modalitas, metode, parameter);
                return (
                  <tr key={r._key}>
                    <td className="text-xs text-[var(--muted)]">{i + 1}</td>
                    {kolom.map((k) => (
                      <td key={k.key}>
                        {k.jenis === "hitung"
                          ? fmt(k.hitung ? k.hitung(hasil) : null, k.desimal ?? 3)
                          : (r[k.key] ?? "").trim() || "-"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TabelGulir>
      </section>

      {catatan && (
        <section className="kartu p-5">
          <h2 className="mb-2 text-sm font-semibold">Catatan Reviu</h2>
          <p className="whitespace-pre-wrap text-sm">{catatan}</p>
        </section>
      )}
    </div>
  );
}
