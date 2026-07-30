import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BarisData,
  BlokLembar,
  DaftarData,
  JudulSeksiLembar,
} from "@/components/lembar";
import { namaLengkap, tanggalPanjang, teksAtauStrip } from "@/lib/format";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { pastikanBoleh } from "@/lib/akses";
import { requireUser } from "@/lib/session";
import { getTemplate } from "@/lib/templates";
import { KETERANGAN_KETIDAKPASTIAN } from "@/lib/templates/common";
import { normalisasiHasil } from "@/lib/templates/types";
import { TombolCetak } from "./tombol-cetak";

export default async function CetakLaporan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const laporan = await prisma.laporan.findUnique({
    where: { id },
    include: {
      instansi: true,
      alatRadiologi: true,
      user: true,
      alatUkur: { include: { alatUkur: true }, orderBy: { urutan: "asc" } },
    },
  });
  if (!laporan) notFound();
  pastikanBoleh(user, laporan.userId);

  const template = getTemplate(laporan.jenisAlat);
  if (!template) notFound();

  const hasil = normalisasiHasil(template, parseJson(laporan.hasilUji, {}));
  const konf = parseJson<Record<string, string | string[]>>(
    laporan.konfigurasiSnapshot,
    {},
  );
  const inst = laporan.instansi;
  const alat = laporan.alatRadiologi;
  const penguji = namaLengkap(laporan.user);

  const nilaiKonf = (key: string) => {
    const v = konf[key];
    if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "-";
    return teksAtauStrip(v);
  };

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
      <span>{laporan.nomorLaporan || "Laporan hasil kalibrasi"}</span>
      <span>
        Laporan kerja internal — bukan sertifikat resmi berlegalitas BAPETEN/BPAFK.
      </span>
    </div>
  );

  return (
    <div>
      <div className="tanpa-cetak mb-4 flex flex-wrap items-center gap-2">
        <TombolCetak />
        <Link href={`/laporan/${laporan.id}`} className="tombol tombol-sekunder">
          Kembali ke form
        </Link>
        <p className="text-xs text-[var(--muted)]">
          Pada dialog cetak, pilih tujuan &ldquo;Save as PDF&rdquo;, ukuran A4, dan matikan
          header/footer bawaan browser.
        </p>
      </div>

      <div className="lembar">
        {/* ================= Halaman 1 — Ringkasan Laporan ================= */}
        <section className="lembar-halaman">
          <div style={{ textAlign: "center", marginBottom: "6mm" }}>
            <h1 style={{ fontSize: "13pt", fontWeight: 700, letterSpacing: "0.02em" }}>
              LAPORAN HASIL KALIBRASI
            </h1>
            <p style={{ fontSize: "10pt", fontWeight: 700, marginTop: "1mm" }}>
              {template.judulLaporan}
            </p>
            <p style={{ fontSize: "9pt", marginTop: "1.5mm" }}>
              Nomor : {teksAtauStrip(laporan.nomorLaporan)}
            </p>
          </div>

          <DaftarData>
            <BarisData label="Nama Alat" nilai={template.namaAlat} />
            <BarisData label="Nomor Order" nilai={teksAtauStrip(laporan.nomorOrder)} />
            <BarisData label="Merek" nilai={teksAtauStrip(alat.merk)} />
            <BarisData label="Model / Tipe" nilai={teksAtauStrip(alat.model)} />
            <BarisData label="Nomor Seri" nilai={teksAtauStrip(alat.noSeri)} />
            <BarisData label="Nama Pemilik" nilai={inst.namaFasilitas || inst.namaInstansi} />
            <BarisData label="Identitas Pemilik" nilai={teksAtauStrip(inst.identitasPemilik)} />
            <BarisData
              label="Alamat Pemilik"
              nilai={[inst.alamat, inst.kota, inst.provinsi].filter(Boolean).join(" - ") || "-"}
            />
            <BarisData label="Nama Ruangan" nilai={teksAtauStrip(laporan.lokasiUji ?? alat.lokasiUnit)} />
            <BarisData label="Tanggal Uji" nilai={tanggalPanjang(laporan.tanggalUji)} />
            <BarisData label="Penanggung Jawab" nilai={penguji} />
            <BarisData label="Lokasi Uji" nilai={teksAtauStrip(laporan.lokasiUji ?? alat.lokasiUnit)} />
            <BarisData label="Hasil Uji" nilai={teksAtauStrip(laporan.kesimpulan)} />
            <BarisData label="Metode Kerja" nilai={teksAtauStrip(laporan.metodeKerja)} />
          </DaftarData>

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
            hasil kalibrasi alat radiologi. Dokumen ini bukan sertifikat resmi
            berlegalitas dan tidak ditandatangani secara elektronik bersertifikat.
            Ketidakpastian pengukuran dilaporkan pada tingkat kepercayaan 95 % dengan
            faktor cakupan k = 2.
          </div>

          <div style={{ marginTop: "12mm", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ textAlign: "center", width: "70mm" }}>
              <p style={{ fontSize: "8.6pt" }}>
                {teksAtauStrip(inst.kota)},{" "}
                {tanggalPanjang(laporan.tanggalTerbit ?? laporan.tanggalUji)}
              </p>
              <p style={{ fontSize: "8.6pt", marginTop: "1mm" }}>Fisikawan Medis</p>
              <div style={{ height: "20mm" }} />
              <p style={{ fontSize: "8.6pt", fontWeight: 700, borderTop: "0.6pt solid #333", paddingTop: "1mm" }}>
                {penguji}
              </p>
              {laporan.user.nip && (
                <p style={{ fontSize: "8pt" }}>NIP. {laporan.user.nip}</p>
              )}
            </div>
          </div>

          {footer}
        </section>

        {/* ================= Halaman 2 — Data administrasi & konfigurasi ================= */}
        <section className="lembar-halaman">
          <div style={{ textAlign: "center", marginBottom: "5mm" }}>
            <h2 style={{ fontSize: "11pt", fontWeight: 700 }}>HASIL KALIBRASI</h2>
            <p style={{ fontSize: "10pt", fontWeight: 700 }}>{template.judulLaporan}</p>
          </div>

          <JudulSeksiLembar>A. DATA ADMINISTRASI</JudulSeksiLembar>
          <DaftarData>
            <BarisData no={1} label="NIB" nilai={teksAtauStrip(inst.nib)} />
            <BarisData no={2} label="Nama Instansi" nilai={inst.namaInstansi} />
            <BarisData no={3} label="Nomor Izin Pesawat" nilai={teksAtauStrip(inst.nomorIzinPesawat)} />
            <BarisData no={4} label="Nama Fasilitas" nilai={teksAtauStrip(inst.namaFasilitas)} />
            <BarisData no={5} label="Alamat" nilai={teksAtauStrip(inst.alamat)} />
            <BarisData no={6} label="Kota" nilai={teksAtauStrip(inst.kota)} />
            <BarisData no={7} label="Provinsi" nilai={teksAtauStrip(inst.provinsi)} />
            <BarisData no={8} label="Telepon" nilai={teksAtauStrip(inst.telepon)} />
            <BarisData no={9} label="Email" nilai={teksAtauStrip(inst.email)} />
            <BarisData no={10} label="Nama PPR" nilai={teksAtauStrip(inst.namaPPR)} />
            <BarisData no={11} label="No. SIB" nilai={teksAtauStrip(inst.noSIB)} />
            <BarisData no={12} label="Lokasi Unit" nilai={teksAtauStrip(laporan.lokasiUji ?? alat.lokasiUnit)} />
            <BarisData no={13} label="Tanggal Uji" nilai={tanggalPanjang(laporan.tanggalUji)} />
            <BarisData no={14} label="Nomor Laporan Hasil Uji" nilai={teksAtauStrip(laporan.nomorLaporan)} />
          </DaftarData>

          <JudulSeksiLembar>B. DATA KONFIGURASI</JudulSeksiLembar>
          {template.konfigurasi.map((grup, i) => (
            <div key={grup.id} style={{ marginBottom: "2.5mm" }}>
              <p style={{ fontSize: "8.6pt", fontWeight: 700, marginBottom: "0.8mm" }}>
                {i + 1}. {grup.judul}
              </p>
              <DaftarData>
                {grup.fields.map((f, j) => (
                  <BarisData
                    key={f.key}
                    no={String.fromCharCode(97 + j)}
                    label={f.satuan ? `${f.label} (${f.satuan})` : f.label}
                    nilai={nilaiKonf(f.key)}
                  />
                ))}
              </DaftarData>
            </div>
          ))}

          <JudulSeksiLembar>C. DATA PERSONEL</JudulSeksiLembar>
          <DaftarData>
            <BarisData no={1} label="Nama Fisikawan Medis" nilai={penguji} />
            <BarisData no={2} label="NIP" nilai={teksAtauStrip(laporan.user.nip)} />
          </DaftarData>

          {footer}
        </section>

        {/* ================= Halaman 3 — Hasil uji teknis ================= */}
        <section className="lembar-halaman">
          <JudulSeksiLembar>
            1.1. {template.seksi[0]?.judul ?? "Uji Kondisi Lingkungan"}
          </JudulSeksiLembar>
          {template.seksi[0]?.blok.map((b) => (
            <BlokLembar key={b.id} blok={b} hasil={hasil} />
          ))}

          <JudulSeksiLembar>1.2. Hasil Uji Teknis</JudulSeksiLembar>
          {template.seksi.slice(1).map((seksi) => (
            <div key={seksi.id}>
              <p style={{ fontSize: "9pt", fontWeight: 700, margin: "2.5mm 0 1.5mm" }}>
                {seksi.judul}
              </p>
              {seksi.blok.map((b) => (
                <BlokLembar key={b.id} blok={b} hasil={hasil} />
              ))}
            </div>
          ))}

          <JudulSeksiLembar>1.3. Alat Ukur yang Digunakan</JudulSeksiLembar>
          <table className="berbingkai hindari-potong">
            <thead>
              <tr>
                <th>Nama Alat</th>
                <th>Merek</th>
                <th>Model / Tipe</th>
                <th>Nomor Seri</th>
                <th>Tertelusur ke</th>
                <th>Masa Kalibrasi s/d</th>
              </tr>
            </thead>
            <tbody>
              {laporan.alatUkur.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    -
                  </td>
                </tr>
              ) : (
                laporan.alatUkur.map(({ alatUkur: a }) => (
                  <tr key={a.id}>
                    <td>{a.nama}</td>
                    <td>{teksAtauStrip(a.merek)}</td>
                    <td>{teksAtauStrip(a.modelTipe)}</td>
                    <td>{teksAtauStrip(a.noSeri)}</td>
                    <td>{teksAtauStrip(a.tertelusurKe)}</td>
                    <td>{tanggalPanjang(a.masaKalibrasiSampai)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="hindari-potong">
            <JudulSeksiLembar>1.4. Kesimpulan</JudulSeksiLembar>
            <p style={{ fontSize: "8.6pt", whiteSpace: "pre-line" }}>
              {teksAtauStrip(laporan.kesimpulan)}
            </p>

            <JudulSeksiLembar>1.5. Catatan</JudulSeksiLembar>
            <p style={{ fontSize: "8.6pt", whiteSpace: "pre-line" }}>
              {teksAtauStrip(laporan.catatan)}
            </p>

            <JudulSeksiLembar>1.6. Rekomendasi</JudulSeksiLembar>
            <p style={{ fontSize: "8.6pt", whiteSpace: "pre-line" }}>
              {teksAtauStrip(laporan.rekomendasi)}
            </p>

            <JudulSeksiLembar>1.7. Keterangan</JudulSeksiLembar>
            <ol style={{ fontSize: "8.6pt", paddingLeft: "5mm", listStyle: "decimal" }}>
              <li>Metode Kerja mengacu pada : {teksAtauStrip(laporan.metodeKerja)}</li>
              <li>{KETERANGAN_KETIDAKPASTIAN}</li>
              <li>
                Parameter yang ditulis &ldquo;-&rdquo; atau &ldquo;Tidak dilakukan&rdquo;
                berarti tidak diuji atau tidak berlaku untuk alat ini.
              </li>
            </ol>

            <JudulSeksiLembar>1.8. Fisikawan Medis</JudulSeksiLembar>
            <div style={{ marginTop: "3mm", width: "70mm" }}>
              <div style={{ height: "18mm" }} />
              <p
                style={{
                  fontSize: "8.6pt",
                  fontWeight: 700,
                  borderTop: "0.6pt solid #333",
                  paddingTop: "1mm",
                }}
              >
                {penguji}
              </p>
              {laporan.user.nip && <p style={{ fontSize: "8pt" }}>NIP. {laporan.user.nip}</p>}
            </div>
          </div>

          {footer}
        </section>
      </div>
    </div>
  );
}
