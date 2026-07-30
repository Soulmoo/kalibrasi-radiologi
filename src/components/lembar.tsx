import type { ReactNode } from "react";
import { hitungBlok } from "@/lib/evaluasi";
import type { Blok, HasilUji } from "@/lib/templates/types";
import { labelVerdict } from "@/lib/templates/types";

/** Baris "label : nilai" seperti pada bagian Data Administrasi dokumen contoh. */
export function BarisData({
  no,
  label,
  nilai,
}: {
  no?: number | string;
  label: string;
  nilai: ReactNode;
}) {
  return (
    <tr>
      {no !== undefined && (
        <td style={{ border: "none", width: "7mm", verticalAlign: "top" }}>{no}.</td>
      )}
      <td style={{ border: "none", width: "55mm", verticalAlign: "top" }}>{label}</td>
      <td style={{ border: "none", width: "4mm", verticalAlign: "top" }}>:</td>
      <td style={{ border: "none", verticalAlign: "top" }}>{nilai}</td>
    </tr>
  );
}

export function DaftarData({ children }: { children: ReactNode }) {
  return (
    <table style={{ marginBottom: "3mm" }}>
      <tbody>{children}</tbody>
    </table>
  );
}

export function JudulSeksiLembar({ children }: { children: ReactNode }) {
  return (
    <h3 style={{ fontWeight: 700, fontSize: "9pt", margin: "3mm 0 1.5mm" }}>{children}</h3>
  );
}

/** Render satu blok parameter uji sebagai tabel berbingkai siap cetak. */
export function BlokLembar({ blok, hasil }: { blok: Blok; hasil: HasilUji }) {
  const t = hitungBlok(blok, hasil);
  const tampilkanEvaluasi = !blok.tanpaEvaluasi && Boolean(blok.evaluasi);
  const kolomTampil = blok.kolom.filter((k) => !k.hanyaForm);

  // Blok alat bantu yang sama sekali tidak diisi tidak perlu ikut tercetak.
  if (blok.opsional) {
    const adaIsi = t.baris.some((b) =>
      kolomTampil.some((k) => k.jenis !== "label" && (b.sel[k.key] ?? "-") !== "-"),
    );
    if (!adaIsi) return null;
  }

  const metaTerisi = (blok.metaFields ?? []).filter(
    (f) => (t.meta[f.key] ?? "").trim() !== "",
  );

  return (
    <div className="hindari-potong" style={{ marginBottom: "4mm" }}>
      <p style={{ fontWeight: 700, fontSize: "8.6pt", marginBottom: "1mm" }}>
        {blok.judul}
      </p>

      {metaTerisi.length > 0 && (
        <p style={{ fontSize: "8pt", marginBottom: "1mm" }}>
          Setting:{" "}
          {metaTerisi
            .map(
              (f) => `${f.label} ${t.meta[f.key]}${f.satuan ? ` ${f.satuan}` : ""}`,
            )
            .join(" · ")}
        </p>
      )}

      <table className="berbingkai">
        <thead>
          <tr>
            {kolomTampil.map((k) => (
              <th key={k.key} style={{ width: k.lebar }}>
                {k.label}
                {k.satuan ? ` (${k.satuan})` : ""}
              </th>
            ))}
            {tampilkanEvaluasi && <th>Nilai Lolos Uji</th>}
            {tampilkanEvaluasi && <th>Keterangan</th>}
          </tr>
        </thead>
        <tbody>
          {t.baris.map((b) => (
            <tr key={b.baris._key}>
              {kolomTampil.map((k) => (
                <td
                  key={k.key}
                  style={{
                    textAlign: k.jenis === "label" || k.jenis === "text" ? "left" : "center",
                  }}
                >
                  {b.sel[k.key] ?? "-"}
                </td>
              ))}
              {tampilkanEvaluasi && (
                <td style={{ textAlign: "center" }}>{b.toleransi}</td>
              )}
              {tampilkanEvaluasi && (
                <td style={{ textAlign: "center" }}>
                  {b.verdict ? labelVerdict(b.verdict) : "-"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {t.ringkasan.length > 0 && (
        <table className="berbingkai" style={{ marginTop: "1.5mm" }}>
          <tbody>
            {t.ringkasan.map((r) => (
              <tr key={r.label}>
                <td style={{ width: "45%" }}>{r.label}</td>
                <td style={{ textAlign: "center", width: "18%" }}>{r.nilai}</td>
                <td style={{ textAlign: "center", width: "22%" }}>{r.toleransi ?? "-"}</td>
                <td style={{ textAlign: "center" }}>
                  {r.verdict ? labelVerdict(r.verdict) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
