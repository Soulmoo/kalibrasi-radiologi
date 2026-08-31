import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BarisData,
  DaftarData,
  JudulSeksiLembar,
  TandaTanganFismed,
} from "@/components/lembar";
import { pastikanBolehLihat } from "@/lib/akses";
import {
  type BarisPasien,
  MIN_PASIEN,
  type MetodeAudit,
  type ParameterAudit,
  labelMetode,
  labelSituasi,
  parameterDefault,
  kelompokkanAudit,
  rekapAudit,
  tindakLanjutSituasi,
} from "@/lib/audit-dosis";
import { fmt } from "@/lib/calc";
import { namaLengkap, tanggalPanjang, teksAtauStrip } from "@/lib/format";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  KETERANGAN_TPDI_CT,
  type ModalitasAudit,
  SUMBER_TPDI,
  labelKelompokUsia,
  namaModalitasAudit,
} from "@/lib/tpdi";
import { TombolCetak } from "./tombol-cetak";

export default async function CetakAudit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const audit = await prisma.auditDosis.findUnique({
    where: { id },
    include: { instansi: true, alatRadiologi: true, user: true },
  });
  if (!audit) notFound();
  pastikanBolehLihat(user, audit.userId);

  const modalitas = audit.modalitas as ModalitasAudit;
  const metode = audit.metode as MetodeAudit;
  const parameter = parseJson<ParameterAudit>(audit.parameter, parameterDefault());
  const rows = parseJson<BarisPasien[]>(audit.dataPasien, []);

  const grup = kelompokkanAudit(rows, modalitas, metode, parameter);
  const rekap = rekapAudit(grup, rows);
  const desimal = modalitas === "ct-scan" ? 1 : 3;

  const inst = audit.instansi;
  const alat = audit.alatRadiologi;
  const fismed = namaLengkap(audit.user);
  const situasiMuncul = Array.from(
    new Set(grup.map((g) => g.situasi).filter((s): s is NonNullable<typeof s> => s !== null)),
  );

  const footer = (
    <div
      style={{
        marginTop: "auto",
        paddingTop: "4mm",
        borderTop: "0.5pt solid #999",
        fontSize: "7pt",
        color: "#444",
        display: "flex",
        justifyContent: "space-between",
        gap: "4mm",
      }}
    >
      <span>Audit dosis pasien terhadap TPD Indonesia</span>
      <span>Laporan kerja internal — bukan sertifikat resmi berlegalitas BAPETEN/BPAFK.</span>
    </div>
  );

  return (
    <div>
      <div className="tanpa-cetak mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <TombolCetak />
          <Link href={`/audit-dosis/${audit.id}`} className="tombol tombol-sekunder">
            Kembali ke audit
          </Link>
          <p className="text-xs text-[var(--muted)]">
            Pada dialog cetak, pilih tujuan &ldquo;Save as PDF&rdquo;, ukuran A4, dan matikan
            header/footer bawaan browser.
          </p>
        </div>
        <p className="mt-3 rounded border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
          Lembar ini sengaja hanya memuat <strong>nilai tipikal per grup</strong>. Identitas
          dan baris data pasien tidak ikut tercetak — yang dilaporkan dalam penerapan TPD
          memang nilai tipikal, bukan daftar pasien.
        </p>
      </div>

      <div className="lembar">
        <section className="lembar-halaman">
          <div style={{ textAlign: "center", marginBottom: "6mm" }}>
            <h1 style={{ fontSize: "13pt", fontWeight: 700, letterSpacing: "0.02em" }}>
              LAPORAN AUDIT DOSIS PASIEN
            </h1>
            <p style={{ fontSize: "10pt", fontWeight: 700, marginTop: "1mm" }}>
              TINGKAT PANDUAN DIAGNOSTIK — {namaModalitasAudit(audit.modalitas).toUpperCase()}
            </p>
            <p style={{ fontSize: "9pt", marginTop: "1.5mm" }}>
              Periode {tanggalPanjang(audit.periodeMulai)} s/d{" "}
              {tanggalPanjang(audit.periodeSelesai)}
            </p>
          </div>

          <DaftarData>
            <BarisData label="Nama Pemilik" nilai={inst.namaFasilitas || inst.namaInstansi} />
            <BarisData
              label="Alamat Pemilik"
              nilai={[inst.alamat, inst.kota, inst.provinsi].filter(Boolean).join(" - ") || "-"}
            />
            <BarisData label="Modalitas" nilai={namaModalitasAudit(audit.modalitas)} />
            <BarisData
              label="Pesawat Sinar-X"
              nilai={
                [alat.namaAlat, alat.merk, alat.model, alat.noSeri]
                  .filter(Boolean)
                  .join(" · ") || "-"
              }
            />
            <BarisData label="Nama Ruangan" nilai={teksAtauStrip(alat.lokasiUnit)} />
            <BarisData label="Sumber Angka Dosis" nilai={labelMetode(audit.metode)} />
            <BarisData label="Jumlah Data Pasien" nilai={`${rekap.totalPasien} data`} />
            <BarisData
              label="Jumlah Grup"
              nilai={`${rekap.totalGrup} grup · ${rekap.grupCukup} memenuhi syarat survei (≥ ${MIN_PASIEN} data)`}
            />
            <BarisData label="Acuan TPD Nasional" nilai={SUMBER_TPDI} />
            <BarisData label="Pelaksana" nilai={fismed} />
          </DaftarData>

          {metode === "estimasi" && parameter.regresi && (
            <div
              style={{
                marginTop: "4mm",
                border: "0.6pt solid #666",
                padding: "3mm",
                fontSize: "8pt",
              }}
            >
              <strong>Metode estimasi.</strong> Dosis pasien diperkirakan dari data keluaran
              radiasi hasil uji kesesuaian (Pedoman Teknis TPDI butir 3.2.4.1.2). Regresi
              keluaran tabung: Y = {parameter.regresi.a.toExponential(3)} · kV
              <sup>{fmt(parameter.regresi.n, 4)}</sup> mGy/mAs (R² ={" "}
              {fmt(parameter.regresi.r2, 4)}, {parameter.regresi.titik} titik kV), diukur pada
              jarak {parameter.jarakUkur} cm. INAK = Y(kV) × mAs × (jarak ukur / FSD)², dan
              ESAK = {parameter.bsf} × INAK.
            </div>
          )}

          <div
            style={{
              marginTop: "4mm",
              border: "0.6pt solid #666",
              padding: "3mm",
              fontSize: "8pt",
              background: "#f6f8fa",
            }}
          >
            <strong>Status dokumen.</strong> Laporan ini merupakan laporan kerja internal
            penerapan Tingkat Panduan Diagnostik. Dokumen ini bukan sertifikat resmi
            berlegalitas dan bukan pelaporan resmi ke Si-INTAN. TPD adalah indikator
            optimisasi proteksi radiasi, <strong>bukan nilai batas dosis</strong> — nilai yang
            melampaui TPD nasional tidak berarti pemeriksaan salah, melainkan menjadi pemicu
            reviu sebagaimana Pedoman Teknis butir 3.3.
          </div>

          <JudulSeksiLembar>
            Nilai Tipikal Dosis dan Pembandingan terhadap TPD Nasional
          </JudulSeksiLembar>

          {grup.length === 0 ? (
            <p style={{ fontSize: "8pt" }}>
              Belum ada grup yang bisa dihitung. Isi jenis pemeriksaan dan umur pasien
              terlebih dahulu.
            </p>
          ) : (
            <table className="berbingkai" style={{ fontSize: "7.5pt" }}>
              <thead>
                <tr>
                  <th>Jenis Pemeriksaan</th>
                  <th>Kelompok Umur</th>
                  <th>n</th>
                  <th>Nilai Tipikal (Q2)</th>
                  <th>TPD Lokal (Q3)</th>
                  <th>TPD Nasional</th>
                  <th>Simpangan</th>
                  <th>Situasi</th>
                </tr>
              </thead>
              <tbody>
                {grup.map((g) => (
                  <tr key={`${g.pemeriksaan}|${g.usia}`}>
                    <td>{g.pemeriksaan}</td>
                    <td>{labelKelompokUsia(g.usia)}</td>
                    <td>
                      {g.n}
                      {!g.cukupSampel ? " *" : ""}
                    </td>
                    <td>
                      {fmt(g.nilaiTipikal, desimal)} {g.tpdi?.satuan ?? ""}
                      {g.tpdiSekunder
                        ? ` / ${fmt(g.nilaiTipikalSekunder, desimal)} ${g.tpdiSekunder.satuan}`
                        : ""}
                    </td>
                    <td>
                      {fmt(g.tpdLokal, desimal)} {g.tpdi?.satuan ?? ""}
                    </td>
                    <td>
                      {g.tpdi
                        ? `${g.tpdi.nilai} ${g.tpdi.satuan}${
                            g.tpdiSekunder
                              ? ` / ${g.tpdiSekunder.nilai} ${g.tpdiSekunder.satuan}`
                              : ""
                          }`
                        : "belum ditetapkan"}
                    </td>
                    <td>{g.selisihPersen === null ? "-" : `${fmt(g.selisihPersen, 1)} %`}</td>
                    <td>{g.situasi ? labelSituasi(g.situasi) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p style={{ fontSize: "7pt", marginTop: "2mm", color: "#444" }}>
            Nilai tipikal = median (Q2) sebaran dosis; TPD lokal = persentil ke-75 (Q3).
            {grup.some((g) => !g.cukupSampel) && (
              <>
                {" "}
                Tanda * = jumlah data di bawah {MIN_PASIEN} sehingga belum memenuhi syarat
                survei TPD (Pedoman Teknis butir 1.5.17).
              </>
            )}
            {modalitas === "radiografi-umum" && (
              <> Nilai tipikal ditampilkan sebagai ESAK / INAK.</>
            )}
            {modalitas === "ct-scan" && (
              <> Nilai tipikal ditampilkan sebagai CTDIvol / DLP. {KETERANGAN_TPDI_CT.join(" ")}</>
            )}
          </p>

          {situasiMuncul.length > 0 && (
            <>
              <JudulSeksiLembar>Tindak Lanjut</JudulSeksiLembar>
              <ul style={{ fontSize: "8pt", paddingLeft: "5mm" }}>
                {situasiMuncul.map((s) => (
                  <li key={s} style={{ marginBottom: "1mm" }}>
                    <strong>{labelSituasi(s)}:</strong> {tindakLanjutSituasi(s)}
                  </li>
                ))}
              </ul>
            </>
          )}

          {audit.catatan && (
            <>
              <JudulSeksiLembar>Catatan Reviu</JudulSeksiLembar>
              <p style={{ fontSize: "8pt", whiteSpace: "pre-wrap" }}>{audit.catatan}</p>
            </>
          )}

          <div
            style={{
              marginTop: "8mm",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <div style={{ width: "70mm", textAlign: "center", fontSize: "8pt" }}>
              <p>Pelaksana Optimisasi,</p>
              <TandaTanganFismed
                gambar={null}
                nama={fismed}
                nip={audit.user.nip}
                tinggi="18mm"
              />
            </div>
          </div>

          {footer}
        </section>
      </div>
    </div>
  );
}
