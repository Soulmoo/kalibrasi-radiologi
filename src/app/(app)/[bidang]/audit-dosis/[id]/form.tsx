"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { type AksiState, simpanAudit } from "@/app/actions/audit-dosis";
import { Field, PesanError, TabelGulir } from "@/components/field";
import { RekapAuditTabel, TindakLanjutAudit } from "@/components/rekap-audit";
import {
  type BarisPasien,
  MIN_PASIEN,
  type MetodeAudit,
  type ParameterAudit,
  STATUS_DRAF,
  STATUS_PERMANEN,
  barisPasienBaru,
  hitungBarisPasien,
  kelompokkanAudit,
  rekapAudit,
  RUTE_AUDIT,
} from "@/lib/audit-dosis";
import { fmt } from "@/lib/calc";
import { type ModalitasAudit, SUMBER_TPDI, daftarPemeriksaan } from "@/lib/tpdi";
import { kolomPasien } from "./kolom";

export type AuditForm = {
  id: string;
  modalitas: ModalitasAudit;
  metode: MetodeAudit;
  parameter: ParameterAudit;
  periodeMulaiInput: string;
  periodeSelesaiInput: string;
  catatan: string | null;
  rows: BarisPasien[];
};

const awal: AksiState = {};

export function FormAudit({ audit }: { audit: AuditForm }) {
  const [state, action, pending] = useActionState(simpanAudit, awal);
  const [rows, setRows] = useState<BarisPasien[]>(
    audit.rows.length > 0 ? audit.rows : [barisPasienBaru("r1")],
  );
  const [konfirmasi, setKonfirmasi] = useState(false);

  const kolom = useMemo(
    () => kolomPasien(audit.modalitas, audit.metode),
    [audit.modalitas, audit.metode],
  );
  const pemeriksaan = useMemo(() => daftarPemeriksaan(audit.modalitas), [audit.modalitas]);

  const grup = useMemo(
    () => kelompokkanAudit(rows, audit.modalitas, audit.metode, audit.parameter),
    [rows, audit.modalitas, audit.metode, audit.parameter],
  );
  const rekap = useMemo(() => rekapAudit(grup, rows), [grup, rows]);

  function setSel(key: string, kolomKey: string, nilai: string) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [kolomKey]: nilai } : r)));
  }

  function tambahBaris(n = 1) {
    setRows((prev) => [
      ...prev,
      ...Array.from({ length: n }, (_, i) => barisPasienBaru(`r${Date.now()}-${i}`)),
    ]);
  }

  function hapusBaris(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r._key !== key)));
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={audit.id} />
      <input type="hidden" name="dataPasien" value={JSON.stringify(rows)} />

      {/* ---------- Periode ---------- */}
      <section className="kartu p-5">
        <h2 className="mb-3 text-sm font-semibold">Periode Audit</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Periode Mulai"
            name="periodeMulai"
            type="date"
            defaultValue={audit.periodeMulaiInput}
          />
          <Field
            label="Periode Selesai"
            name="periodeSelesai"
            type="date"
            defaultValue={audit.periodeSelesaiInput}
          />
        </div>

        {audit.metode === "estimasi" && audit.parameter.regresi && (
          <p className="mt-4 rounded border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
            Regresi keluaran tabung yang dibekukan:{" "}
            <strong>
              Y = {audit.parameter.regresi.a.toExponential(3)} · kV
              <sup>{fmt(audit.parameter.regresi.n, 4)}</sup>
            </strong>{" "}
            mGy/mAs · R² = {fmt(audit.parameter.regresi.r2, 4)} · jarak ukur{" "}
            {audit.parameter.jarakUkur} cm · BSF {audit.parameter.bsf}
            {audit.parameter.jarakFokusMeja
              ? ` · jarak fokus–meja ${audit.parameter.jarakFokusMeja} cm`
              : ""}
          </p>
        )}
      </section>

      {/* ---------- Data pasien ---------- */}
      <section className="kartu overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold">Data Pasien</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Satu baris = satu pemeriksaan. Jenis pemeriksaan dan umur wajib diisi — keduanya
            yang menentukan pengelompokan; baris tanpa keduanya tidak ikut dihitung. Syarat
            survei TPD: minimal {MIN_PASIEN} data per jenis pemeriksaan per kelompok umur.
          </p>
        </div>

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
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const hasil = hitungBarisPasien(r, audit.modalitas, audit.metode, audit.parameter);
                return (
                  <tr key={r._key}>
                    <td className="text-xs text-[var(--muted)]">{i + 1}</td>
                    {kolom.map((k) => (
                      <td key={k.key}>
                        {k.jenis === "hitung" ? (
                          <span className="text-[var(--muted)]">
                            {fmt(k.hitung ? k.hitung(hasil) : null, k.desimal ?? 3)}
                          </span>
                        ) : k.jenis === "pilihan" ? (
                          <select
                            value={r[k.key] ?? ""}
                            onChange={(e) => setSel(r._key, k.key, e.target.value)}
                            className="input-dasar"
                          >
                            <option value="">—</option>
                            {(k.key === "jenisPemeriksaan" ? pemeriksaan : (k.opsi ?? [])).map(
                              (o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ),
                            )}
                          </select>
                        ) : (
                          <input
                            value={r[k.key] ?? ""}
                            inputMode={k.jenis === "number" ? "decimal" : undefined}
                            onChange={(e) => setSel(r._key, k.key, e.target.value)}
                            className="input-dasar"
                          />
                        )}
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        onClick={() => hapusBaris(r._key)}
                        className="text-sm text-red-600 hover:underline"
                        aria-label={`Hapus baris ${i + 1}`}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TabelGulir>

        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3">
          <button type="button" onClick={() => tambahBaris(1)} className="tombol tombol-sekunder">
            + 1 baris
          </button>
          <button type="button" onClick={() => tambahBaris(10)} className="tombol tombol-sekunder">
            + 10 baris
          </button>
          <button type="button" onClick={() => tambahBaris(20)} className="tombol tombol-sekunder">
            + 20 baris
          </button>
        </div>
      </section>

      {/* ---------- Rekap ---------- */}
      <section className="kartu overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              Nilai Tipikal &amp; Pembandingan terhadap TPD Nasional
            </h2>
            <span className="text-xs text-[var(--muted)]">
              {rekap.totalPasien} data · {rekap.totalGrup} grup · {rekap.grupCukup} memenuhi
              syarat survei
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Sumber TPD nasional: {SUMBER_TPDI}. TPD adalah indikator optimisasi, bukan nilai
            batas — tidak ada penilaian lolos/tidak lolos di sini.
          </p>
        </div>

        <RekapAuditTabel grup={grup} desimal={audit.modalitas === "ct-scan" ? 1 : 3} />

        {grup.length > 0 && (
          <div className="border-t border-[var(--border)] px-4 py-3">
            <h3 className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">
              Tindak lanjut yang diwajibkan
            </h3>
            <TindakLanjutAudit grup={grup} />
          </div>
        )}
      </section>

      {/* ---------- Catatan ---------- */}
      <section className="kartu p-5">
        <Field label="Catatan Reviu">
          <textarea
            name="catatan"
            rows={4}
            defaultValue={audit.catatan ?? ""}
            placeholder="Hasil analisis penyebab, tindakan perbaikan yang direncanakan, dan personel yang terlibat."
            className="input-dasar"
          />
        </Field>
      </section>

      {!konfirmasi && <PesanError pesan={state.error} />}
      {state.ok && (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Draf tersimpan.
        </p>
      )}

      <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--background)] py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status ditentukan tombol mana yang ditekan, bukan dropdown. */}
          <button
            type="submit"
            name="status"
            value={STATUS_DRAF}
            disabled={pending}
            className="tombol tombol-utama"
          >
            {pending ? "Menyimpan…" : "Simpan Draf"}
          </button>

          <button
            type="button"
            onClick={() => setKonfirmasi(true)}
            disabled={pending}
            className="tombol tombol-selesai"
          >
            Simpan Permanen
          </button>

          <Link href={`${RUTE_AUDIT}/${audit.id}/cetak`} className="tombol tombol-sekunder">
            Pratinjau &amp; Export PDF
          </Link>
          <Link href={RUTE_AUDIT} className="tombol tombol-sekunder">
            Kembali ke daftar
          </Link>
        </div>
      </div>

      {konfirmasi && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-kunci-audit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setKonfirmasi(false);
          }}
        >
          <div className="kartu w-full max-w-lg p-5 text-left">
            <h2 id="judul-kunci-audit" className="text-sm font-semibold">
              Simpan permanen audit ini?
            </h2>

            <p className="mt-3 text-sm">
              Audit akan <strong>dikunci</strong> dan tidak dapat diubah lagi oleh siapa pun,
              termasuk Anda.
            </p>

            <ul className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
              <li>• Data pasien, nilai tipikal, dan catatan reviu ikut terkunci.</li>
              <li>• Audit terkunci tidak bisa dihapus, kecuali oleh master.</li>
              <li>• Audit tetap bisa dibuka, dicetak, dan diekspor jadi PDF.</li>
              <li>
                • Setelah terkunci, identitas pasien dapat dihapus tanpa mengubah angka
                dosisnya.
              </li>
            </ul>

            {rekap.grupCukup < rekap.totalGrup && (
              <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {rekap.totalGrup - rekap.grupCukup} dari {rekap.totalGrup} grup masih di bawah{" "}
                {MIN_PASIEN} data dan belum memenuhi syarat survei TPD. Audit tetap bisa
                dikunci, tapi grup tersebut belum bisa dilaporkan sebagai nilai tipikal.
              </p>
            )}

            {state.error && (
              <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {state.error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setKonfirmasi(false)}
                disabled={pending}
                className="tombol tombol-sekunder"
              >
                Batal, periksa lagi
              </button>
              {/* Dialog sengaja TIDAK ditutup di onClick: menutupnya akan melepas
                  tombol ini dari DOM sebelum form benar-benar terkirim. */}
              <button
                type="submit"
                name="status"
                value={STATUS_PERMANEN}
                disabled={pending}
                className="tombol tombol-selesai"
              >
                {pending ? "Menyimpan…" : "Ya, simpan permanen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
