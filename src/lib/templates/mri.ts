import {
  akurasiGeometrik,
  akurasiPosisiIrisan,
  fmt,
  ghostingRatio,
  keseragamanCitra,
  num,
  snr,
  snrTernormalisasi,
  tebalIrisanACR,
} from "@/lib/calc";
import { REKOMENDASI_DEFAULT, seksiKondisiLingkungan } from "./common";
import type { Template, Verdict } from "./types";

/**
 * Magnetic Resonance Imaging (MRI) — mengikuti LHU-PRUK-10.
 *
 * Parameter dan toleransi mengacu ACR MRI Quality Control Manual dan NEMA
 * MS 1/3/6 (PRD Lampiran A.5). Seluruh pengukuran dilakukan pada dua mode
 * pembobotan, T1 dan T2, sehingga tiap blok memakai dua baris tetap.
 */

const lolosJika = (ok: boolean | null): Verdict =>
  ok === null ? "na" : ok ? "lolos" : "tidak-lolos";

const BARIS_MODE = [
  { key: "t1", label: "T1" },
  { key: "t2", label: "T2" },
];

export const mri: Template = {
  key: "mri",
  nama: "MRI",
  namaAlat: "Magnetic Resonance Imaging (MRI)",
  judulLaporan: "MAGNETIC RESONANCE IMAGING (MRI)",
  metodeKerjaDefault: "MK-PRUK-10-rev-02",
  kodeLHU: "LHU-PRUK-10-rev-02",
  rekomendasiDefault: REKOMENDASI_DEFAULT,

  konfigurasi: [
    {
      id: "identitas",
      judul: "Identitas Alat",
      fields: [
        { key: "merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "model", label: "Model/Tipe", jenis: "text" },
        { key: "seri", label: "No. Seri", jenis: "text" },
        { key: "medan", label: "Kuat Medan Magnet", jenis: "text", satuan: "T" },
      ],
    },
  ],

  seksi: [
    seksiKondisiLingkungan(),

    {
      id: "setting",
      judul: "Setting Pesawat",
      blok: [
        {
          id: "setting-pesawat",
          judul: "Setting Pesawat",
          catatan: "Parameter akuisisi yang dipakai saat pengambilan citra fantom.",
          modeBaris: "tetap",
          tanpaEvaluasi: true,
          kolom: [
            { key: "_label", label: "Setting Pesawat", jenis: "label", lebar: "34%" },
            { key: "t1", label: "T1", jenis: "text" },
            { key: "t2", label: "T2", jenis: "text" },
          ],
          baris: [
            { key: "tr", label: "TR (ms)" },
            { key: "te", label: "TE (ms)" },
            { key: "tebal", label: "Tebal irisan (mm)" },
            { key: "fov", label: "FOV (cm)" },
            { key: "nex", label: "NEX / average" },
            { key: "matrik", label: "Matrik" },
            { key: "coil", label: "Coil" },
          ],
        },
      ],
    },

    {
      id: "geometrik",
      judul: "A. Akurasi Geometrik Fantom",
      blok: [
        {
          id: "akurasi-geometrik",
          judul: "Akurasi Geometrik Fantom",
          catatan: "Akurasi (%) = |terukur − sebenarnya| / sebenarnya × 100.",
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Mode", jenis: "label", lebar: "12%" },
            { key: "titik", label: "Titik Ukur", jenis: "text", placeholder: "Diameter" },
            { key: "terukur", label: "Hasil Pengukuran", satuan: "cm", jenis: "number" },
            { key: "sebenarnya", label: "Nilai Sebenarnya", satuan: "cm", jenis: "number" },
            {
              key: "akurasi",
              label: "Akurasi Geometrik",
              jenis: "hitung",
              desimal: 1,
              akhiran: " %",
              hitung: (b) => akurasiGeometrik(num(b.terukur), num(b.sebenarnya)),
            },
          ],
          baris: BARIS_MODE.map((m) => ({ ...m, awal: { titik: "Diameter" } })),
          toleransi: "< 2 %",
          evaluasi: (b) => {
            const v = akurasiGeometrik(num(b.terukur), num(b.sebenarnya));
            return lolosJika(v === null ? null : v < 2);
          },
        },
      ],
    },

    {
      id: "resolusi",
      judul: "B. Resolusi Spasial",
      blok: [
        {
          id: "resolusi-spasial",
          judul: "Resolusi Spasial",
          catatan:
            "Dibaca langsung dari hole array / resolution pattern pada fantom ACR — " +
            "pembacaan observasional, bukan hasil kalkulasi (PRD A.5.2).",
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Mode", jenis: "label", lebar: "16%" },
            { key: "hasil", label: "Hasil Uji", satuan: "mm", jenis: "number" },
            {
              key: "batas",
              label: "Batas maksimum",
              satuan: "mm",
              jenis: "number",
              hanyaForm: true,
            },
          ],
          baris: BARIS_MODE.map((m) => ({ ...m, awal: { batas: "1.0" } })),
          toleransi: (b) => {
            const batas = num(b.batas);
            return batas === null ? "sesuai acuan ACR" : `≤ ${fmt(batas, 1)} mm`;
          },
          evaluasi: (b) => {
            const v = num(b.hasil);
            const batas = num(b.batas);
            if (v === null || batas === null) return "na";
            return lolosJika(v <= batas);
          },
        },
      ],
    },

    {
      id: "snr",
      judul: "C. Signal to Noise Ratio (SNR)",
      blok: [
        {
          id: "snr",
          judul: "Signal to Noise Ratio",
          catatan:
            "SNR = 0.655 × (sinyal rerata fantom / simpangan baku derau), mengikuti " +
            "koreksi sebaran Rayleigh NEMA MS 1 untuk derau latar pada citra magnitudo. " +
            "SNR ternormalisasi = SNR / tebal irisan (PRD A.5.3). " +
            "Blok ini tidak dievaluasi lolos/tidak lolos karena dokumen sumber tidak " +
            "mencantumkan nilai batas.",
          modeBaris: "tetap",
          tanpaEvaluasi: true,
          kolom: [
            { key: "_label", label: "Mode", jenis: "label", lebar: "10%" },
            { key: "sinyal", label: "Sinyal Fantom", jenis: "number" },
            { key: "derau", label: "Rerata Derau (SD)", jenis: "number" },
            { key: "tebal", label: "Tebal Irisan", satuan: "mm", jenis: "number" },
            {
              key: "snr",
              label: "Nilai SNR",
              jenis: "hitung",
              desimal: 2,
              hitung: (b) => snr(num(b.sinyal), num(b.derau)),
            },
            {
              key: "snrNorm",
              label: "SNR Ternormalisasi",
              jenis: "hitung",
              desimal: 1,
              hitung: (b) =>
                snrTernormalisasi(snr(num(b.sinyal), num(b.derau)), num(b.tebal)),
            },
          ],
          baris: BARIS_MODE,
        },
      ],
    },

    {
      id: "keseragaman",
      judul: "D. Keseragaman Citra",
      blok: [
        {
          id: "keseragaman-citra",
          judul: "Percent Image Uniformity (PIU)",
          catatan:
            "PIU (%) = 100 × [1 − (Smaks − Smin) / (Smaks + Smin)]. Batas ACR: ≥ 82 % " +
            "untuk MRI 3 T, ≥ 87.5 % untuk MRI di bawah 3 T — sesuaikan kolom batas.",
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Mode", jenis: "label", lebar: "10%" },
            { key: "maks", label: "Sinyal Maksimum", jenis: "number" },
            { key: "min", label: "Sinyal Minimum", jenis: "number" },
            {
              key: "piu",
              label: "Keseragaman Citra",
              jenis: "hitung",
              desimal: 1,
              akhiran: " %",
              hitung: (b) => keseragamanCitra(num(b.maks), num(b.min)),
            },
            {
              key: "batas",
              label: "Batas minimum",
              satuan: "%",
              jenis: "number",
              hanyaForm: true,
            },
          ],
          baris: BARIS_MODE.map((m) => ({ ...m, awal: { batas: "82" } })),
          toleransi: (b) => {
            const batas = num(b.batas);
            return batas === null ? "sesuai acuan ACR" : `≥ ${fmt(batas, 1)} %`;
          },
          evaluasi: (b) => {
            const v = keseragamanCitra(num(b.maks), num(b.min));
            const batas = num(b.batas);
            if (v === null || batas === null) return "na";
            return lolosJika(v >= batas);
          },
        },
      ],
    },

    {
      id: "low-contrast",
      judul: "E. Low Contrast Object Detectability",
      blok: [
        {
          id: "low-contrast",
          judul: "Low Contrast Object Detectability",
          catatan:
            "Jumlah spoke lengkap yang terdeteksi pada tiap baris kontras fantom ACR, " +
            "lalu dijumlahkan. Batas ACR: ≥ 37 spoke untuk MRI ≥ 3 T.",
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Mode", jenis: "label", lebar: "10%" },
            { key: "b11", label: "Baris 11", jenis: "number" },
            { key: "b10", label: "Baris 10", jenis: "number" },
            { key: "b9", label: "Baris 9", jenis: "number" },
            { key: "b8", label: "Baris 8", jenis: "number" },
            {
              key: "total",
              label: "Jumlah Spoke",
              jenis: "hitung",
              desimal: 0,
              hitung: (b) => {
                const v = [b.b11, b.b10, b.b9, b.b8].map(num);
                if (v.every((x) => x === null)) return null;
                return v.reduce<number>((a, x) => a + (x ?? 0), 0);
              },
            },
            {
              key: "batas",
              label: "Batas minimum",
              satuan: "spoke",
              jenis: "number",
              hanyaForm: true,
            },
          ],
          baris: BARIS_MODE.map((m) => ({ ...m, awal: { batas: "37" } })),
          toleransi: (b) => {
            const batas = num(b.batas);
            return batas === null ? "sesuai acuan ACR" : `jumlah total ≥ ${fmt(batas, 0)} spoke`;
          },
          evaluasi: (b) => {
            const v = [b.b11, b.b10, b.b9, b.b8].map(num);
            const batas = num(b.batas);
            if (v.every((x) => x === null) || batas === null) return "na";
            const total = v.reduce<number>((a, x) => a + (x ?? 0), 0);
            return lolosJika(total >= batas);
          },
        },
      ],
    },

    {
      id: "posisi-irisan",
      judul: "F. Akurasi Posisi Irisan",
      blok: [
        {
          id: "posisi-irisan",
          judul: "Akurasi Posisi Irisan",
          catatan:
            "Rerata pergeseran bar-ramp sisi kiri dan kanan terhadap posisi seharusnya " +
            "(PRD A.5.6). Batas ACR: < 5 mm.",
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Mode", jenis: "label", lebar: "12%" },
            { key: "kiri", label: "a (sisi kiri)", satuan: "mm", jenis: "number" },
            { key: "kanan", label: "b (sisi kanan)", satuan: "mm", jenis: "number" },
            {
              key: "akurasi",
              label: "Akurasi Posisi Irisan",
              satuan: "mm",
              jenis: "hitung",
              desimal: 1,
              hitung: (b) => akurasiPosisiIrisan(num(b.kiri), num(b.kanan)),
            },
          ],
          baris: BARIS_MODE,
          toleransi: "< 5 mm",
          evaluasi: (b) => {
            const v = akurasiPosisiIrisan(num(b.kiri), num(b.kanan));
            return lolosJika(v === null ? null : v < 5);
          },
        },
      ],
    },

    {
      id: "tebal-irisan",
      judul: "G. Akurasi Tebal Irisan",
      blok: [
        {
          id: "tebal-irisan",
          judul: "Akurasi Tebal Irisan",
          catatan:
            "Tebal irisan terukur = 0.2 × (panjang bawah × panjang atas) / " +
            "(panjang bawah + panjang atas), formula ramp ACR (PRD A.5.7).",
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Mode", jenis: "label", lebar: "10%" },
            { key: "bawah", label: "Panjang Bawah", satuan: "mm", jenis: "number" },
            { key: "atas", label: "Panjang Atas", satuan: "mm", jenis: "number" },
            {
              key: "tebal",
              label: "Tebal Slice Terukur",
              satuan: "mm",
              jenis: "hitung",
              desimal: 2,
              hitung: (b) => tebalIrisanACR(num(b.bawah), num(b.atas)),
            },
            { key: "nominal", label: "Tebal Nominal", satuan: "mm", jenis: "number", hanyaForm: true },
            { key: "toleransiMm", label: "Toleransi ±", satuan: "mm", jenis: "number", hanyaForm: true },
          ],
          baris: BARIS_MODE.map((m) => ({
            ...m,
            awal: { nominal: "5", toleransiMm: "0.7" },
          })),
          toleransi: (b) => {
            const n = num(b.nominal);
            const t = num(b.toleransiMm);
            if (n === null || t === null) return "sesuai acuan ACR";
            return `${fmt(n, 0)} ± ${fmt(t, 1)} mm`;
          },
          evaluasi: (b) => {
            const v = tebalIrisanACR(num(b.bawah), num(b.atas));
            const n = num(b.nominal);
            const t = num(b.toleransiMm);
            if (v === null || n === null || t === null) return "na";
            return lolosJika(Math.abs(v - n) <= t);
          },
        },
      ],
    },

    {
      id: "ghosting",
      judul: "H. Percent Signal Ghosting (PSG)",
      blok: [
        {
          id: "ghosting",
          judul: "Percent Signal Ghosting",
          catatan:
            "GR = |(atas + bawah) − (kiri + kanan)| / (2 × sinyal ROI fantom), memakai " +
            "ROI besar ±200 cm² pada fantom dan empat ROI ±10 cm² di latar (PRD A.5.8). " +
            "Batas ACR: GR ≤ 0.025.",
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Mode", jenis: "label", lebar: "8%" },
            { key: "fantom", label: "ROI Fantom (200 cm²)", jenis: "number" },
            { key: "atas", label: "ROI Atas", jenis: "number" },
            { key: "bawah", label: "ROI Bawah", jenis: "number" },
            { key: "kanan", label: "ROI Kanan", jenis: "number" },
            { key: "kiri", label: "ROI Kiri", jenis: "number" },
            {
              key: "gr",
              label: "Hasil Evaluasi (GR)",
              jenis: "hitung",
              desimal: 3,
              hitung: (b) =>
                ghostingRatio(
                  num(b.fantom),
                  num(b.atas),
                  num(b.bawah),
                  num(b.kiri),
                  num(b.kanan),
                ),
            },
          ],
          baris: BARIS_MODE,
          toleransi: "GR ≤ 0.025",
          evaluasi: (b) => {
            const v = ghostingRatio(
              num(b.fantom),
              num(b.atas),
              num(b.bawah),
              num(b.kiri),
              num(b.kanan),
            );
            return lolosJika(v === null ? null : v <= 0.025);
          },
        },
      ],
    },
  ],
};
