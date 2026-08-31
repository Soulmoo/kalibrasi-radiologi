"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { type AksiState, buatAudit } from "@/app/actions/audit-dosis";
import { Field, PesanError } from "@/components/field";
import { BSF_RADIOGRAFI_UMUM, JARAK_UKUR_BAKU_CM, fmt } from "@/lib/calc";
import type { ModalitasAudit } from "@/lib/tpdi";

type OpsiAlat = { id: string; label: string; modalitas: ModalitasAudit };
type OpsiLaporan = {
  id: string;
  alatRadiologiId: string;
  label: string;
  regresi: { a: number; n: number; r2: number; titik: number } | null;
};

function awalTahun() {
  return `${new Date().getFullYear()}-01-01`;
}
function akhirTahun() {
  return `${new Date().getFullYear()}-12-31`;
}

const awal: AksiState = {};

export function FormAuditBaru({
  alat,
  laporan,
}: {
  alat: OpsiAlat[];
  laporan: OpsiLaporan[];
}) {
  const [state, action, pending] = useActionState(buatAudit, awal);
  const [alatId, setAlatId] = useState(alat[0]?.id ?? "");
  const [metode, setMetode] = useState<"indikator" | "estimasi">("indikator");

  const terpilih = alat.find((a) => a.id === alatId);
  const modalitas = terpilih?.modalitas ?? "radiografi-umum";

  // CT-Scan selalu membaca CTDIvol/DLP dari konsol — tidak ada jalur estimasi
  // dari keluaran tabung untuk modalitas ini.
  const bolehEstimasi = modalitas === "radiografi-umum";
  const metodeAktif = bolehEstimasi ? metode : "indikator";

  const sumber = laporan.filter((l) => l.alatRadiologiId === alatId);
  const [sumberId, setSumberId] = useState("");
  const sumberTerpilih = sumber.find((l) => l.id === sumberId) ?? sumber[0];

  return (
    <form action={action} className="space-y-5">
      <div className="kartu space-y-4 p-5">
        <Field label="Alat Radiologi" required>
          <select
            name="alatRadiologiId"
            required
            value={alatId}
            onChange={(e) => {
              setAlatId(e.target.value);
              setSumberId("");
            }}
            className="input-dasar"
          >
            {alat.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Periode Mulai"
            name="periodeMulai"
            type="date"
            defaultValue={awalTahun()}
            required
          />
          <Field
            label="Periode Selesai"
            name="periodeSelesai"
            type="date"
            defaultValue={akhirTahun()}
            required
            petunjuk="Evaluasi TPD wajib dilakukan minimal sekali dalam setahun."
          />
        </div>
      </div>

      {/* ---------- Percabangan jalur data ---------- */}
      <div className="kartu space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold">Sumber Angka Dosis</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Pedoman Teknis TPDI butir 3.2.4.1 membagi ini jadi dua jalur yang saling
            eksklusif — pilih sesuai apakah pesawatnya menampilkan dosis atau tidak.
          </p>
        </div>

        <input type="hidden" name="metode" value={metodeAktif} />

        <div className="grid gap-3">
          <label className="flex cursor-pointer items-start gap-2 rounded border border-[var(--border)] p-3 text-sm">
            <input
              type="radio"
              className="mt-1"
              checked={metodeAktif === "indikator"}
              onChange={() => setMetode("indikator")}
            />
            <span>
              <span className="block font-medium">
                Jalur A — pesawat punya indikator dosis
              </span>
              <span className="block text-xs text-[var(--muted)]">
                {modalitas === "ct-scan"
                  ? "CTDIvol dan DLP dibaca dari konsol atau laporan dosis DICOM tiap pasien."
                  : "ESAK / Skin Dose / ESD dibaca langsung dari konsol pesawat. Tidak perlu data keluaran tabung."}
              </span>
            </span>
          </label>

          <label
            className={`flex items-start gap-2 rounded border border-[var(--border)] p-3 text-sm ${
              bolehEstimasi ? "cursor-pointer" : "opacity-50"
            }`}
          >
            <input
              type="radio"
              className="mt-1"
              disabled={!bolehEstimasi}
              checked={metodeAktif === "estimasi"}
              onChange={() => setMetode("estimasi")}
            />
            <span>
              <span className="block font-medium">
                Jalur B — pesawat tidak punya indikator dosis
              </span>
              <span className="block text-xs text-[var(--muted)]">
                {bolehEstimasi
                  ? "INAK diperkirakan dari data keluaran radiasi hasil uji kesesuaian, lalu ESAK = BSF × INAK."
                  : "Tidak berlaku untuk CT-Scan — CTDIvol dan DLP selalu tersedia di konsol."}
              </span>
            </span>
          </label>
        </div>

        {metodeAktif === "estimasi" && (
          <div className="space-y-4 border-t border-[var(--border)] pt-4">
            <Field label="Laporan Kalibrasi Sumber Keluaran Radiasi" required>
              {sumber.length === 0 ? (
                <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Belum ada laporan kalibrasi tersimpan permanen untuk alat ini. Selesaikan
                  dulu laporan kalibrasinya, termasuk blok Akurasi Tegangan Tabung beserta
                  kolom Dosis.
                </p>
              ) : (
                <select
                  name="laporanSumberId"
                  required
                  value={sumberTerpilih?.id ?? ""}
                  onChange={(e) => setSumberId(e.target.value)}
                  className="input-dasar"
                >
                  {sumber.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                      {l.regresi ? "" : " — data keluaran belum lengkap"}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            {sumberTerpilih &&
              (sumberTerpilih.regresi ? (
                <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                  Regresi keluaran tabung:{" "}
                  <strong>
                    Y = {sumberTerpilih.regresi.a.toExponential(3)} · kV
                    <sup>{fmt(sumberTerpilih.regresi.n, 4)}</sup>
                  </strong>{" "}
                  mGy/mAs · R² = {fmt(sumberTerpilih.regresi.r2, 4)} dari{" "}
                  {sumberTerpilih.regresi.titik} titik kV. Nilai ini akan dibekukan ke audit.
                </p>
              ) : (
                <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  Laporan ini belum bisa dipakai. Blok Akurasi Tegangan Tabung harus terisi
                  Set mA, Set s, dan kolom Dosis pada minimal dua nilai kVp yang berbeda.
                </p>
              ))}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Jarak Ukur Keluaran"
                name="jarakUkur"
                type="number"
                defaultValue={String(JARAK_UKUR_BAKU_CM)}
                petunjuk="cm. Jarak saat keluaran radiasi diukur, bukan FDD klinis."
              />
              <Field
                label="Faktor Hamburan Balik (BSF)"
                name="bsf"
                type="number"
                defaultValue={String(BSF_RADIOGRAFI_UMUM)}
                petunjuk="Si-INTAN memakai 1.35 tetap untuk radiografi umum."
              />
              <Field
                label="Jarak Fokus–Meja"
                name="jarakFokusMeja"
                type="number"
                petunjuk="cm. Opsional; dipakai menurunkan FSD dari tebal pasien."
              />
            </div>

            <p className="rounded border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
              FSD diisi per pasien di form berikutnya. Karena hubungannya kuadrat terbalik,
              galat FSD terkuadratkan — meleset 10 cm pada FSD 70 cm menggeser INAK sekitar
              25 %, jadi jangan memakai satu angka tetap untuk semua pemeriksaan.
            </p>
          </div>
        )}
      </div>

      <PesanError pesan={state.error} />

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="tombol tombol-utama">
          {pending ? "Membuat…" : "Lanjut ke Entri Data Pasien"}
        </button>
        <Link href="/audit-dosis" className="tombol tombol-sekunder">
          Batal
        </Link>
      </div>
    </form>
  );
}
