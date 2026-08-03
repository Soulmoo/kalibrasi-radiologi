"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { simpanLaporan, type AksiState } from "@/app/actions/laporan";
import { Field, PesanError, TabelGulir } from "@/components/field";
import { draftKesimpulan, hitungBlok, rekapLaporan } from "@/lib/evaluasi";
import { getTemplate } from "@/lib/templates";
import type {
  Baris,
  Blok,
  HasilUji,
  Verdict,
} from "@/lib/templates/types";
import { blokKosong, labelVerdict } from "@/lib/templates/types";

export type LaporanForm = {
  id: string;
  jenisAlat: string;
  nomorLaporan: string | null;
  nomorOrder: string | null;
  tanggalUjiInput: string;
  tanggalTerbitInput: string;
  lokasiUji: string | null;
  metodeKerja: string | null;
  kesimpulan: string | null;
  catatan: string | null;
  rekomendasi: string | null;
  status: string;
  hasilUji: HasilUji;
  alatUkurTerpilih: string[];
};

type AlatUkurOpsi = {
  id: string;
  nama: string;
  merek: string | null;
  modelTipe: string | null;
  noSeri: string | null;
  kadaluarsa: boolean;
  masaKalibrasiTeks: string;
};

const awal: AksiState = {};

export function FormLaporan({
  laporan,
  alatUkur,
}: {
  laporan: LaporanForm;
  alatUkur: AlatUkurOpsi[];
}) {
  const template = getTemplate(laporan.jenisAlat)!;
  const [state, action, pending] = useActionState(simpanLaporan, awal);
  const [hasil, setHasil] = useState<HasilUji>(laporan.hasilUji);
  const [kesimpulan, setKesimpulan] = useState(laporan.kesimpulan ?? "");
  const [terpilih, setTerpilih] = useState<string[]>(laporan.alatUkurTerpilih);

  const rekap = useMemo(() => rekapLaporan(template, hasil), [template, hasil]);

  // Sesudah menyimpan, status yang berlaku adalah yang dikembalikan server —
  // tombolnya langsung bertukar tanpa menunggu halaman dimuat ulang.
  const statusSekarang = state.status ?? laporan.status;
  const selesai = statusSekarang === "selesai";

  function setSel(blokId: string, barisKey: string, kolomKey: string, nilai: string) {
    setHasil((prev) => {
      const blok = prev[blokId];
      if (!blok) return prev;
      return {
        ...prev,
        [blokId]: {
          ...blok,
          rows: blok.rows.map((r) =>
            r._key === barisKey ? { ...r, [kolomKey]: nilai } : r,
          ),
        },
      };
    });
  }

  function setMeta(blokId: string, key: string, nilai: string) {
    setHasil((prev) => {
      const blok = prev[blokId];
      if (!blok) return prev;
      return { ...prev, [blokId]: { ...blok, meta: { ...blok.meta, [key]: nilai } } };
    });
  }

  function tambahBaris(blok: Blok) {
    setHasil((prev) => {
      const s = prev[blok.id] ?? blokKosong(blok);
      const key = `r${Date.now()}`;
      return {
        ...prev,
        [blok.id]: { ...s, rows: [...s.rows, { _key: key, ...(blok.barisBaru ?? {}) }] },
      };
    });
  }

  function hapusBaris(blokId: string, barisKey: string) {
    setHasil((prev) => {
      const s = prev[blokId];
      if (!s) return prev;
      return { ...prev, [blokId]: { ...s, rows: s.rows.filter((r) => r._key !== barisKey) } };
    });
  }

  function toggleAlatUkur(id: string) {
    setTerpilih((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={laporan.id} />
      <input type="hidden" name="hasilUji" value={JSON.stringify(hasil)} />
      {terpilih.map((id) => (
        <input key={id} type="hidden" name="alatUkurId" value={id} />
      ))}

      {template.catatanLingkup && (
        <p className="rounded border border-[var(--border)] bg-[var(--brand-soft)] px-4 py-3 text-sm">
          {template.catatanLingkup}
        </p>
      )}

      {/* ---------- Identitas laporan ---------- */}
      <section className="kartu p-5">
        <h2 className="mb-4 text-sm font-semibold">Identitas Laporan</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Nomor Laporan"
            name="nomorLaporan"
            defaultValue={laporan.nomorLaporan}
            placeholder="I/PK/C-01/VIII/25"
            petunjuk="Penomoran bebas — tidak dibangkitkan sistem."
          />
          <Field label="Nomor Order" name="nomorOrder" defaultValue={laporan.nomorOrder} />
          <Field label="Lokasi Uji" name="lokasiUji" defaultValue={laporan.lokasiUji} />
          <Field label="Tanggal Uji" name="tanggalUji" type="date" defaultValue={laporan.tanggalUjiInput} required />
          <Field label="Tanggal Laporan" name="tanggalTerbit" type="date" defaultValue={laporan.tanggalTerbitInput} />
          <Field label="Metode Kerja" name="metodeKerja" defaultValue={laporan.metodeKerja} />
        </div>
      </section>

      {/* ---------- Parameter uji ---------- */}
      {template.seksi.map((seksi) => (
        <section key={seksi.id} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {seksi.judul}
          </h2>
          {seksi.blok.map((blok) => (
            <TabelBlok
              key={blok.id}
              blok={blok}
              hasil={hasil}
              onSel={setSel}
              onMeta={setMeta}
              onTambah={tambahBaris}
              onHapus={hapusBaris}
            />
          ))}
        </section>
      ))}

      {/* ---------- Alat ukur ---------- */}
      <section className="kartu p-5">
        <h2 className="text-sm font-semibold">Alat Ukur yang Digunakan</h2>
        <p className="mb-3 mt-1 text-xs text-[var(--muted)]">
          Dipilih dari registry bersama. Alat dengan masa kalibrasi terlewat tetap bisa
          dipilih — sistem hanya menandai, tidak memblokir.
        </p>
        {alatUkur.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Belum ada alat ukur di registry.{" "}
            <Link href="/alat-ukur/baru" className="text-[var(--brand)] hover:underline">
              Tambahkan dulu
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {alatUkur.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-start gap-2 rounded border border-[var(--border)] px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={terpilih.includes(a.id)}
                  onChange={() => toggleAlatUkur(a.id)}
                />
                <span>
                  <span className="block font-medium">{a.nama}</span>
                  <span className="block text-xs text-[var(--muted)]">
                    {[a.merek, a.modelTipe, a.noSeri].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <span
                    className={`block text-xs ${a.kadaluarsa ? "text-amber-700" : "text-[var(--muted)]"}`}
                  >
                    Masa kalibrasi s/d {a.masaKalibrasiTeks}
                    {a.kadaluarsa ? " (terlewat)" : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Kesimpulan ---------- */}
      <section className="kartu p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Kesimpulan, Catatan &amp; Rekomendasi</h2>
          <span className="text-xs text-[var(--muted)]">
            Rekap evaluasi: {rekap.lolos} lolos · {rekap.tidakLolos} tidak lolos ·{" "}
            {rekap.tidakDiuji} tidak diuji
          </span>
        </div>

        {rekap.tidakLolos > 0 && (
          <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Parameter belum memenuhi nilai lolos uji: {rekap.daftarGagal.join("; ")}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">Kesimpulan</span>
              <button
                type="button"
                className="tombol tombol-sekunder"
                onClick={() => setKesimpulan(draftKesimpulan(template, hasil))}
              >
                Isi draf otomatis
              </button>
            </div>
            <textarea
              name="kesimpulan"
              rows={2}
              value={kesimpulan}
              onChange={(e) => setKesimpulan(e.target.value)}
              className="input-dasar"
            />
          </div>

          <Field label="Catatan">
            <textarea name="catatan" rows={2} defaultValue={laporan.catatan ?? ""} className="input-dasar" />
          </Field>

          <Field label="Rekomendasi">
            <textarea name="rekomendasi" rows={3} defaultValue={laporan.rekomendasi ?? ""} className="input-dasar" />
          </Field>

        </div>
      </section>

      <PesanError pesan={state.error} />
      {state.ok && (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {selesai
            ? "Laporan diselesaikan dan ditandatangani."
            : "Laporan tersimpan sebagai draf."}
        </p>
      )}

      <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--background)] py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status ditentukan tombol mana yang ditekan, bukan dropdown: nilai
              name/value milik tombol submit ikut masuk ke FormData. Tombol
              "Simpan Laporan" sengaja mengirim status yang sedang berlaku,
              supaya menyimpan perubahan biasa tidak pernah mengubah status. */}
          <button
            type="submit"
            name="status"
            value={statusSekarang}
            disabled={pending}
            className="tombol tombol-utama"
          >
            {pending ? "Menyimpan…" : "Simpan Laporan"}
          </button>

          {selesai ? (
            <button
              type="submit"
              name="status"
              value="draft"
              disabled={pending}
              className="tombol tombol-sekunder"
            >
              Kembalikan ke Draf
            </button>
          ) : (
            <button
              type="submit"
              name="status"
              value="selesai"
              disabled={pending}
              className="tombol tombol-selesai"
            >
              Selesaikan Laporan
            </button>
          )}

          <Link href={`/laporan/${laporan.id}/cetak`} className="tombol tombol-sekunder">
            Pratinjau &amp; Export PDF
          </Link>
          <Link href="/laporan" className="tombol tombol-sekunder">
            Kembali ke daftar
          </Link>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              selesai
                ? "bg-green-100 text-green-900"
                : "bg-amber-100 text-amber-900"
            }`}
          >
            {selesai ? "Selesai · ditandatangani" : "Draf · belum ditandatangani"}
          </span>
        </div>

        <p className="mt-2 text-xs text-[var(--muted)]">
          {selesai
            ? "Laporan sudah ditandatangani. Untuk menandatangani ulang dengan tanda tangan terbaru, kembalikan ke Draf lalu selesaikan lagi."
            : "Selama masih Draf, laporan dicetak tanpa tanda tangan. Tekan “Selesaikan Laporan” untuk membubuhkan tanda tangan dari halaman Profil."}{" "}
          Simpan dulu sebelum membuka pratinjau agar perubahan ikut tercetak.
        </p>
      </div>
    </form>
  );
}

/* ---------------- Tabel per blok parameter ---------------- */

function TabelBlok({
  blok,
  hasil,
  onSel,
  onMeta,
  onTambah,
  onHapus,
}: {
  blok: Blok;
  hasil: HasilUji;
  onSel: (blokId: string, barisKey: string, kolomKey: string, nilai: string) => void;
  onMeta: (blokId: string, key: string, nilai: string) => void;
  onTambah: (blok: Blok) => void;
  onHapus: (blokId: string, barisKey: string) => void;
}) {
  const terhitung = hitungBlok(blok, hasil);
  const tampilkanEvaluasi = !blok.tanpaEvaluasi && Boolean(blok.evaluasi);

  return (
    <div className="kartu overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h3 className="text-sm font-semibold">{blok.judul}</h3>
        {blok.catatan && (
          <p className="mt-1 text-xs text-[var(--muted)]">{blok.catatan}</p>
        )}

        {blok.metaFields && blok.metaFields.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {blok.metaFields.map((f) => (
              <label key={f.key} className="text-xs">
                <span className="mb-1 block font-medium text-[var(--muted)]">
                  {f.label}
                  {f.satuan ? ` (${f.satuan})` : ""}
                </span>
                <input
                  className="input-dasar"
                  style={{ width: f.lebar ?? "9rem" }}
                  inputMode={f.jenis === "number" ? "decimal" : undefined}
                  placeholder={f.placeholder}
                  value={terhitung.meta[f.key] ?? ""}
                  onChange={(e) => onMeta(blok.id, f.key, e.target.value)}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <TabelGulir>
        <table className="tabel-data">
          <thead>
            <tr>
              {blok.kolom.map((k) => (
                <th key={k.key} style={{ width: k.lebar }}>
                  {k.label}
                  {k.satuan && (
                    <span className="block font-normal normal-case">({k.satuan})</span>
                  )}
                </th>
              ))}
              {tampilkanEvaluasi && <th>Nilai Lolos Uji</th>}
              {tampilkanEvaluasi && <th>Keterangan</th>}
              {blok.modeBaris === "dinamis" && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {terhitung.baris.map((b) => (
              <tr key={b.baris._key}>
                {blok.kolom.map((k) => (
                  <td key={k.key}>
                    {k.jenis === "label" ? (
                      <span className="font-medium">{b.label}</span>
                    ) : k.jenis === "hitung" ? (
                      <span className="tabular-nums">{b.sel[k.key]}</span>
                    ) : (
                      <input
                        className="input-dasar"
                        inputMode={k.jenis === "number" ? "decimal" : undefined}
                        placeholder={k.placeholder ?? "-"}
                        value={b.baris[k.key] ?? ""}
                        onChange={(e) => onSel(blok.id, b.baris._key, k.key, e.target.value)}
                      />
                    )}
                  </td>
                ))}
                {tampilkanEvaluasi && (
                  <td className="whitespace-nowrap text-xs">{b.toleransi}</td>
                )}
                {tampilkanEvaluasi && (
                  <td>
                    <LabelHasil verdict={b.verdict} />
                  </td>
                )}
                {blok.modeBaris === "dinamis" && (
                  <td>
                    <button
                      type="button"
                      onClick={() => onHapus(blok.id, b.baris._key)}
                      className="text-sm text-red-700 hover:underline"
                      aria-label="Hapus baris"
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </TabelGulir>

      {blok.modeBaris === "dinamis" && (
        <div className="border-t border-[var(--border)] px-4 py-2">
          <button
            type="button"
            onClick={() => onTambah(blok)}
            className="text-sm text-[var(--brand)] hover:underline"
          >
            + Tambah baris
          </button>
        </div>
      )}

      {terhitung.ringkasan.length > 0 && (
        <div className="border-t border-[var(--border)] bg-[#f7f9fb] px-4 py-3">
          <TabelGulir>
            <table className="tabel-data">
              <tbody>
                {terhitung.ringkasan.map((r) => (
                  <tr key={r.label}>
                    <td className="font-medium">{r.label}</td>
                    <td className="tabular-nums">{r.nilai}</td>
                    <td className="text-xs">{r.toleransi ?? ""}</td>
                    <td className="w-32">{r.verdict && <LabelHasil verdict={r.verdict} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelGulir>
        </div>
      )}
    </div>
  );
}

function LabelHasil({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) return null;
  const warna =
    verdict === "lolos"
      ? "bg-green-100 text-green-800"
      : verdict === "tidak-lolos"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs ${warna}`}>
      {labelVerdict(verdict)}
    </span>
  );
}

export type { Baris };
