import {
  ctdiVol,
  ctdiW,
  deviasiPersen,
  fmt,
  kesalahanRelatif,
  koefisienLinier,
  koefisienVariansi,
  num,
  per100mAs,
  rerata,
} from "@/lib/calc";
import { REKOMENDASI_DEFAULT, seksiKondisiLingkungan } from "./common";
import type { Template, Verdict } from "./types";

/** Pesawat Sinar-X CT-Scan — mengikuti LHU-PRUK-06. */

const lolosJika = (ok: boolean | null): Verdict =>
  ok === null ? "na" : ok ? "lolos" : "tidak-lolos";

export const ctScan: Template = {
  key: "ct-scan",
  nama: "CT-Scan",
  namaAlat: "Pesawat Sinar-X CT-Scan",
  judulLaporan: "PESAWAT SINAR-X CT-SCAN",
  metodeKerjaDefault: "MK-PRUK-06-rev-05",
  kodeLHU: "LHU-PRUK-06-rev-05",
  rekomendasiDefault: REKOMENDASI_DEFAULT,

  konfigurasi: [
    {
      id: "scanner",
      judul: "Data Scanner",
      fields: [
        { key: "sc_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "sc_model", label: "Model/Tipe", jenis: "text" },
        { key: "sc_seri", label: "No. Seri", jenis: "text" },
        { key: "sc_tipe", label: "Tipe Scanner", jenis: "pilihan", opsi: ["rotasi/translasi", "hanya rotasi", "lainnya"] },
        { key: "sc_matrik", label: "Matrik Rekonstruksi", jenis: "pilihan", opsi: ["256 x 256", "512 x 512", "1024 x 1024"] },
        { key: "sc_detektor", label: "Tipe Detektor", jenis: "pilihan", opsi: ["solid", "gas", "lainnya"] },
        { key: "sc_spiral", label: "Spiral/Helical", jenis: "text", placeholder: "ya — jumlah slices" },
      ],
    },
    {
      id: "generator",
      judul: "Generator dan Panel Kendali Sinar-X",
      fields: [
        { key: "gen_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "gen_model", label: "Model/Tipe", jenis: "text" },
        { key: "gen_seri", label: "No. Seri", jenis: "text" },
        { key: "gen_tahun", label: "Tahun Produksi", jenis: "text" },
        { key: "gen_pulsa", label: "Tipe Pulsa Generator", jenis: "pilihan", opsi: ["6/12 pulsa", "HF", "potensial konstan"] },
        { key: "gen_kapasitas", label: "Kapasitas Maksimum", jenis: "text", placeholder: "140 kVp / 440 mA / 1 s" },
        { key: "gen_alarm", label: "Alarm Penyinaran", jenis: "multi", opsi: ["audio", "visual"] },
      ],
    },
    {
      id: "tube-housing",
      judul: "Wadah Tabung Sinar-X (Tube Housing)",
      fields: [
        { key: "th_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "th_model", label: "Model/Tipe", jenis: "text" },
        { key: "th_seri", label: "No. Seri", jenis: "text" },
        { key: "th_filter", label: "Filter Bawaan", jenis: "text", satuan: "mmAl" },
      ],
    },
    {
      id: "insert-tube",
      judul: "Tabung Insersi (Insert Tube)",
      fields: [
        { key: "it_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "it_model", label: "Model/Tipe", jenis: "text" },
        { key: "it_seri", label: "No. Seri", jenis: "text" },
        { key: "it_focalBesar", label: "Ukuran Focal Spot (besar)", jenis: "text", satuan: "mm" },
        { key: "it_focalKecil", label: "Ukuran Focal Spot (kecil)", jenis: "text", satuan: "mm" },
        { key: "it_kapasitas", label: "Kapasitas Maksimum", jenis: "text", placeholder: "140 kV / - mA" },
      ],
    },
  ],

  seksi: [
    seksiKondisiLingkungan(),

    {
      id: "generator",
      judul: "A. Generator dan Tabung Sinar-X",
      blok: [
        {
          id: "akurasi-tegangan",
          judul: "Akurasi Tegangan Tabung",
          metaFields: [
            { key: "setMa", label: "Set mA", jenis: "number" },
            { key: "setS", label: "Set s", jenis: "number" },
          ],
          modeBaris: "dinamis",
          barisAwalDinamis: 4,
          barisBaru: { kvpSet: "", kvpTerukur: "", ketidakpastian: "" },
          kolom: [
            { key: "kvpSet", label: "Setting kVp", jenis: "number" },
            { key: "kvpTerukur", label: "Bacaan Rerata", satuan: "kVp", jenis: "number" },
            {
              key: "e",
              label: "Kesalahan Relatif (e)",
              jenis: "hitung",
              desimal: 1,
              akhiran: " %",
              hitung: (b) => kesalahanRelatif(num(b.kvpTerukur), num(b.kvpSet)),
            },
            { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 1.3 %" },
          ],
          toleransi: "e ≤ ± 6 %",
          evaluasi: (b) => {
            const e = kesalahanRelatif(num(b.kvpTerukur), num(b.kvpSet));
            return lolosJika(e === null ? null : Math.abs(e) <= 6);
          },
        },
        {
          id: "keluaran-akurasi",
          judul: "Keluaran Radiasi (Pusat) — Akurasi",
          catatan:
            "Isi dosis dan mAs pengukuran; keluaran per 100 mAs dihitung otomatis. " +
            "Batas boleh diubah mengikuti spesifikasi alat.",
          modeBaris: "dinamis",
          barisAwalDinamis: 1,
          barisBaru: { kvp: "", tebalIrisan: "", dosis: "", mas: "", batas: "45", ketidakpastian: "" },
          kolom: [
            { key: "kvp", label: "Setting kVp", jenis: "number" },
            { key: "tebalIrisan", label: "Tebal Irisan", satuan: "mm", jenis: "number" },
            { key: "dosis", label: "Dosis terukur", satuan: "mGy", jenis: "number" },
            { key: "mas", label: "mAs", jenis: "number" },
            {
              key: "keluaran",
              label: "Keluaran Radiasi",
              satuan: "mGy/100 mAs",
              jenis: "hitung",
              desimal: 2,
              hitung: (b) => per100mAs(num(b.dosis), num(b.mas)),
            },
            { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 2.6 %" },
            {
              key: "batas",
              label: "Batas maksimum",
              satuan: "mGy/100 mAs",
              jenis: "number",
              hanyaForm: true,
            },
          ],
          toleransi: (b) => `≤ ${fmt(num(b.batas), 2)} mGy/100 mAs`,
          evaluasi: (b) => {
            const v = per100mAs(num(b.dosis), num(b.mas));
            const batas = num(b.batas);
            if (v === null || batas === null) return "na";
            return lolosJika(v <= batas);
          },
        },
        {
          id: "keluaran-linieritas",
          judul: "Keluaran Radiasi — Linieritas",
          catatan: "CL = |X₂ − X₁| / (X₂ + X₁) dari keluaran ternormalisasi antar stasiun mAs.",
          metaFields: [
            { key: "kv", label: "Setting kV", jenis: "number" },
            { key: "s", label: "Setting s", jenis: "number" },
          ],
          modeBaris: "dinamis",
          barisAwalDinamis: 3,
          barisBaru: { mas: "", dosis: "" },
          tanpaEvaluasi: true,
          kolom: [
            { key: "mas", label: "mAs", jenis: "number" },
            { key: "dosis", label: "Dosis terukur", satuan: "mGy", jenis: "number" },
            {
              key: "keluaran",
              label: "Keluaran ternormalisasi",
              satuan: "mGy/mAs",
              jenis: "hitung",
              desimal: 4,
              hitung: (b) => {
                const d = num(b.dosis);
                const m = num(b.mas);
                return d === null || m === null || m === 0 ? null : d / m;
              },
            },
          ],
          ringkasanBlok: (ctx) => {
            const keluaran = ctx.rows.map((r) => {
              const d = num(r.dosis);
              const m = num(r.mas);
              return d === null || m === null || m === 0 ? null : d / m;
            });
            const cl = koefisienLinier(keluaran);
            return [
              {
                label: "Koefisien Linier (CL)",
                nilai: fmt(cl, 3),
                toleransi: "CL ≤ 0.1",
                verdict: lolosJika(cl === null ? null : cl <= 0.1),
              },
            ];
          },
        },
        {
          id: "keluaran-reprodusibilitas",
          judul: "Keluaran Radiasi — Reprodusibilitas",
          metaFields: [
            { key: "kv", label: "Setting kV", jenis: "number" },
            { key: "ma", label: "Setting mA", jenis: "number" },
            { key: "s", label: "Setting s", jenis: "number" },
          ],
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Parameter", jenis: "label", lebar: "24%" },
            { key: "m1", label: "1", jenis: "number" },
            { key: "m2", label: "2", jenis: "number" },
            { key: "m3", label: "3", jenis: "number" },
            { key: "m4", label: "4", jenis: "number" },
            { key: "m5", label: "5", jenis: "number" },
            {
              key: "rerata",
              label: "Rerata",
              jenis: "hitung",
              desimal: 3,
              hitung: (b) => rerata([b.m1, b.m2, b.m3, b.m4, b.m5]),
            },
            {
              key: "cv",
              label: "CV",
              jenis: "hitung",
              desimal: 3,
              hitung: (b) => koefisienVariansi([b.m1, b.m2, b.m3, b.m4, b.m5]),
            },
          ],
          baris: [{ key: "output", label: "Keluaran radiasi (mGy)" }],
          toleransi: "CV ≤ 0.05",
          evaluasi: (b) => {
            const cv = koefisienVariansi([b.m1, b.m2, b.m3, b.m4, b.m5]);
            return lolosJika(cv === null ? null : cv <= 0.05);
          },
        },
        {
          id: "hvl",
          judul: "Kualitas Berkas Sinar-X (HVL)",
          catatan:
            "Nilai HVL dibaca langsung dari alat ukur. Batas minimum CT-Scan diisi " +
            "manual mengikuti tabel acuan (contoh dokumen: ≥ 3.8 mmAl pada 120 kV).",
          modeBaris: "dinamis",
          barisAwalDinamis: 1,
          barisBaru: { kv: "", hvl: "", batas: "3.8", ketidakpastian: "" },
          kolom: [
            { key: "kv", label: "Setting kV", jenis: "number" },
            { key: "hvl", label: "Nilai HVL", satuan: "mmAl", jenis: "number" },
            { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 3.40 %" },
            {
              key: "batas",
              label: "Batas minimum",
              satuan: "mmAl",
              jenis: "number",
              hanyaForm: true,
            },
          ],
          toleransi: (b) => `HVL ≥ ${fmt(num(b.batas), 1)} mmAl`,
          evaluasi: (b) => {
            const v = num(b.hvl);
            const batas = num(b.batas);
            if (v === null || batas === null) return "na";
            return lolosJika(v >= batas);
          },
        },
      ],
    },

    {
      id: "dosis",
      judul: "B. Perkiraan Dosis Permukaan Kulit",
      blok: [
        {
          id: "ctdi-pengukuran",
          judul: "Perhitungan CTDIvol dari Pengukuran Pencil Chamber (opsional)",
          catatan:
            "Alat bantu: CTDIw = ⅓·CTDI₁₀₀ pusat + ⅔·rerata CTDI₁₀₀ tepi, lalu CTDIvol = CTDIw / pitch. " +
            "Hasilnya dapat disalin ke kolom CTDIvol terukur di tabel di bawah. Lewati bila CTDIvol dibaca langsung dari alat ukur.",
          metaFields: [{ key: "pitch", label: "Pitch", jenis: "number" }],
          modeBaris: "tetap",
          tanpaEvaluasi: true,
          opsional: true,
          kolom: [
            { key: "_label", label: "Posisi ROI", jenis: "label", lebar: "34%" },
            { key: "nilai", label: "CTDI₁₀₀", satuan: "mGy", jenis: "number" },
          ],
          baris: [
            { key: "pusat", label: "Pusat fantom" },
            { key: "tepi12", label: "Tepi arah jam 12" },
            { key: "tepi3", label: "Tepi arah jam 3" },
            { key: "tepi6", label: "Tepi arah jam 6" },
            { key: "tepi9", label: "Tepi arah jam 9" },
          ],
          ringkasanBlok: (ctx) => {
            const cari = (k: string) => num(ctx.rows.find((r) => r._key === k)?.nilai);
            const w = ctdiW(cari("pusat"), [
              cari("tepi12"),
              cari("tepi3"),
              cari("tepi6"),
              cari("tepi9"),
            ]);
            const vol = ctdiVol(w, num(ctx.meta.pitch));
            return [
              { label: "CTDIw", nilai: `${fmt(w, 2)} mGy` },
              { label: "CTDIvol", nilai: `${fmt(vol, 2)} mGy` },
            ];
          },
        },
        {
          id: "ctdi-deviasi",
          judul: "Dosimetri Kepala/Badan Rutin — Deviasi CTDIvol",
          modeBaris: "dinamis",
          barisAwalDinamis: 1,
          barisBaru: { protokol: "", kv: "", mas: "", s: "", tebalIrisan: "", jumlahImage: "", consul: "", terukur: "" },
          kolom: [
            { key: "protokol", label: "Protokol", jenis: "text", placeholder: "Kepala rutin" },
            { key: "kv", label: "kV", jenis: "number" },
            { key: "mas", label: "mAs", jenis: "number" },
            { key: "s", label: "s", jenis: "number" },
            { key: "tebalIrisan", label: "Tebal Irisan", satuan: "mm", jenis: "number" },
            { key: "jumlahImage", label: "Jumlah Image", jenis: "number" },
            { key: "consul", label: "CTDIvol Consul", satuan: "mGy", jenis: "number" },
            { key: "terukur", label: "CTDIvol Terukur", satuan: "mGy", jenis: "number" },
            {
              key: "deviasi",
              label: "Deviasi",
              jenis: "hitung",
              desimal: 1,
              akhiran: " %",
              hitung: (b) => deviasiPersen(num(b.terukur), num(b.consul)),
            },
          ],
          toleransi: "Deviasi ≤ 20 %",
          evaluasi: (b) => {
            const d = deviasiPersen(num(b.terukur), num(b.consul));
            return lolosJika(d === null ? null : Math.abs(d) <= 20);
          },
        },
      ],
    },

    {
      id: "kualitas-citra",
      judul: "C. Kualitas Citra",
      blok: [
        {
          id: "kualitas-citra-roi",
          judul: "CT Number, Keseragaman, dan Noise",
          catatan:
            "Isi nilai HU dan simpangan baku (noise) tiap ROI pada fantom kualitas citra. " +
            "Δ CT dan keseragaman noise dihitung otomatis dari selisih ROI tepi terhadap ROI pusat.",
          metaFields: [
            { key: "kv", label: "Setting kV", jenis: "number" },
            { key: "mas", label: "Setting mAs", jenis: "number" },
            { key: "tebalIrisan", label: "Tebal Irisan (mm)", jenis: "number" },
          ],
          modeBaris: "tetap",
          tanpaEvaluasi: true,
          kolom: [
            { key: "_label", label: "ROI", jenis: "label", lebar: "34%" },
            { key: "ct", label: "CT Number", satuan: "HU", jenis: "number" },
            { key: "noise", label: "Noise (SD)", jenis: "number" },
          ],
          baris: [
            { key: "pusat", label: "ROI pusat" },
            { key: "atas", label: "ROI tepi atas" },
            { key: "bawah", label: "ROI tepi bawah" },
            { key: "kiri", label: "ROI tepi kiri" },
            { key: "kanan", label: "ROI tepi kanan" },
          ],
          ringkasanBlok: (ctx) => {
            const cari = (k: string) => ctx.rows.find((r) => r._key === k);
            const pusat = num(cari("pusat")?.ct);
            const tepiKeys = ["atas", "bawah", "kiri", "kanan"];
            const tepiCT = tepiKeys
              .map((k) => num(cari(k)?.ct))
              .filter((v): v is number => v !== null);
            const tepiNoise = tepiKeys
              .map((k) => num(cari(k)?.noise))
              .filter((v): v is number => v !== null);

            const deltaCT =
              pusat === null || tepiCT.length === 0
                ? null
                : Math.max(...tepiCT.map((v) => Math.abs(v - pusat)));
            const spreadNoise =
              tepiNoise.length < 2 ? null : Math.max(...tepiNoise) - Math.min(...tepiNoise);

            return [
              {
                label: "CT Number rerata ROI pusat",
                nilai: fmt(pusat, 2),
                toleransi: "CT pusat ≤ ± 4 HU",
                verdict: lolosJika(pusat === null ? null : Math.abs(pusat) <= 4),
              },
              {
                label: "Keseragaman ROI pusat vs ROI tepi (Δ CT)",
                nilai: fmt(deltaCT, 2),
                toleransi: "Δ CT ≤ ± 2 HU",
                verdict: lolosJika(deltaCT === null ? null : deltaCT <= 2),
              },
              {
                label: "Keseragaman noise antar ROI tepi",
                nilai: fmt(spreadNoise, 2),
                toleransi: "≤ ± 2 HU",
                verdict: lolosJika(spreadNoise === null ? null : spreadNoise <= 2),
              },
            ];
          },
        },
      ],
    },
  ],
};
