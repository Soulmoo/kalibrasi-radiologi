import { BIDANG_BAWAAN, type KunciBidang } from "@/lib/bidang";
import { angiografi } from "./angiografi";
import { cArm } from "./c-arm";
import { ctScan } from "./ct-scan";
import { gigi } from "./gigi";
import { linacFoton } from "./linac-foton";
import { mri } from "./mri";
import { radiografiMobile } from "./radiografi-mobile";
import type { Template } from "./types";

/**
 * Registry template modalitas.
 *
 * Menambah modalitas baru = menambah satu file template di folder ini dan
 * mendaftarkannya di sini. Form, kalkulasi, evaluasi, dan layout PDF otomatis
 * mengikuti (PRD bagian 8: skema terkonfigurasi, bukan hard-code).
 *
 * Seluruh modalitas MVP di PRD 5.1 sudah tercakup. USG masih ditunda sampai
 * parameter ujinya tersedia dari BPAFK. Tiap template membawa `bidang`-nya
 * sendiri (Radiologi/Radioterapi), yang menentukan di tab mana ia muncul.
 */
export const TEMPLATES: Template[] = [
  radiografiMobile,
  ctScan,
  gigi,
  angiografi,
  cArm,
  mri,
  // Radioterapi
  linacFoton,
];

export const TEMPLATE_MAP: Record<string, Template> = Object.fromEntries(
  TEMPLATES.map((t) => [t.key, t]),
);

export function getTemplate(key: string): Template | undefined {
  return TEMPLATE_MAP[key];
}

export function namaJenisAlat(key: string): string {
  return TEMPLATE_MAP[key]?.nama ?? key;
}

export function templatesBidang(bidang: KunciBidang): Template[] {
  return TEMPLATES.filter((t) => t.bidang === bidang);
}

/** Kunci jenisAlat milik satu bidang — untuk filter `jenisAlat: { in: ... }` di query. */
export function jenisAlatBidang(bidang: KunciBidang): string[] {
  return templatesBidang(bidang).map((t) => t.key);
}

/**
 * Bidang tempat laporan/alat dengan jenisAlat ini tinggal. Jenis yang tidak
 * lagi terdaftar jatuh ke bidang bawaan supaya link lama tetap bisa dibuka.
 */
export function bidangDariJenisAlat(key: string): KunciBidang {
  return TEMPLATE_MAP[key]?.bidang ?? BIDANG_BAWAAN;
}

export * from "./types";
