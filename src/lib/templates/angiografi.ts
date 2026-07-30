import { REKOMENDASI_DEFAULT, seksiKondisiLingkungan } from "./common";
import {
  konfigurasiFluoroskopi,
  seksiDosisFluoroskopi,
  seksiGeneratorFluoroskopi,
  seksiKolimasiFluoroskopi,
  seksiPencitraanFluoroskopi,
} from "./fluoroskopi";
import type { Template } from "./types";

/** Pesawat Sinar-X Angiografi / Cath Lab — mengikuti LHU-PRUK-05. */
export const angiografi: Template = {
  key: "angiografi",
  nama: "Angiografi / Cath Lab",
  namaAlat: "Pesawat Sinar-X Angiografi",
  judulLaporan: "PESAWAT SINAR-X ANGIOGRAFI",
  metodeKerjaDefault: "MK-PRUK-05-rev-04",
  kodeLHU: "LHU-PRUK-05-rev-04",
  rekomendasiDefault: REKOMENDASI_DEFAULT,

  konfigurasi: konfigurasiFluoroskopi(),

  seksi: [
    seksiKondisiLingkungan(),
    seksiKolimasiFluoroskopi(),
    seksiDosisFluoroskopi(),
    seksiPencitraanFluoroskopi(),
    seksiGeneratorFluoroskopi(),
  ],
};
