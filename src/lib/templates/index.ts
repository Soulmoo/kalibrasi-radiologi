import { angiografi } from "./angiografi";
import { cArm } from "./c-arm";
import { ctScan } from "./ct-scan";
import { gigi } from "./gigi";
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
 * parameter ujinya tersedia dari BPAFK.
 */
export const TEMPLATES: Template[] = [
  radiografiMobile,
  ctScan,
  gigi,
  angiografi,
  cArm,
  mri,
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

export * from "./types";
