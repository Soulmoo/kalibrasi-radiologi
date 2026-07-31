"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bolehUbah } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTemplate } from "@/lib/templates";

export type AksiState = { error?: string; ok?: boolean };

function teks(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

function tanggal(fd: FormData, key: string): Date | null {
  const s = teks(fd, key);
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ---------------- Instansi / Klien ---------------- */

export async function simpanInstansi(
  _prev: AksiState,
  fd: FormData,
): Promise<AksiState> {
  const user = await requireUser();
  const id = teks(fd, "id");
  const namaInstansi = teks(fd, "namaInstansi");
  if (!namaInstansi) return { error: "Nama instansi wajib diisi" };

  const data = {
    namaInstansi,
    namaFasilitas: teks(fd, "namaFasilitas"),
    identitasPemilik: teks(fd, "identitasPemilik"),
    alamat: teks(fd, "alamat"),
    kota: teks(fd, "kota"),
    provinsi: teks(fd, "provinsi"),
    telepon: teks(fd, "telepon"),
    email: teks(fd, "email"),
    nib: teks(fd, "nib"),
    nomorIzinPesawat: teks(fd, "nomorIzinPesawat"),
    namaPPR: teks(fd, "namaPPR"),
    noSIB: teks(fd, "noSIB"),
  };

  if (id) {
    const ada = await prisma.instansi.findUnique({ where: { id } });
    if (!ada) return { error: "Instansi tidak ditemukan" };
    if (!bolehUbah(user, ada.createdById)) return { error: "Anda tidak berhak mengubah data ini" };
    await prisma.instansi.update({ where: { id }, data });
  } else {
    await prisma.instansi.create({ data: { ...data, createdById: user.id } });
  }

  revalidatePath("/instansi");
  redirect("/instansi");
}

export async function hapusInstansi(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");

  const ada = await prisma.instansi.findUnique({ where: { id } });
  if (!ada || !bolehUbah(user, ada.createdById)) redirect("/instansi?error=terlarang");

  const jumlahLaporan = await prisma.laporan.count({ where: { instansiId: id } });
  if (jumlahLaporan > 0) {
    redirect("/instansi?error=terpakai");
  }
  await prisma.instansi.delete({ where: { id } });
  revalidatePath("/instansi");
}

/* ---------------- Alat Radiologi ---------------- */

export async function simpanAlat(_prev: AksiState, fd: FormData): Promise<AksiState> {
  const user = await requireUser();
  const id = teks(fd, "id");
  const instansiId = teks(fd, "instansiId");
  const jenisAlat = teks(fd, "jenisAlat");

  if (!instansiId) return { error: "Instansi wajib dipilih" };
  if (!jenisAlat) return { error: "Jenis alat wajib dipilih" };

  const template = getTemplate(jenisAlat);
  if (!template) return { error: "Jenis alat tidak dikenali" };

  // Alat hanya boleh ditautkan ke instansi milik sendiri.
  const instansi = await prisma.instansi.findUnique({ where: { id: instansiId } });
  if (!instansi || !bolehUbah(user, instansi.createdById)) {
    return { error: "Instansi tidak ditemukan atau bukan milik Anda" };
  }

  // Kumpulkan seluruh field konfigurasi sesuai template modalitas.
  const konfigurasi: Record<string, string | string[]> = {};
  for (const grup of template.konfigurasi) {
    for (const f of grup.fields) {
      if (f.jenis === "multi") {
        konfigurasi[f.key] = fd.getAll(`konf.${f.key}`).map(String);
      } else {
        konfigurasi[f.key] = String(fd.get(`konf.${f.key}`) ?? "").trim();
      }
    }
  }

  const data = {
    instansiId,
    jenisAlat,
    namaAlat: teks(fd, "namaAlat"),
    lokasiUnit: teks(fd, "lokasiUnit"),
    merk: teks(fd, "merk"),
    model: teks(fd, "model"),
    noSeri: teks(fd, "noSeri"),
    tahunProduksi: teks(fd, "tahunProduksi"),
    konfigurasi: JSON.stringify(konfigurasi),
  };

  if (id) {
    const ada = await prisma.alatRadiologi.findUnique({ where: { id } });
    if (!ada) return { error: "Alat tidak ditemukan" };
    if (!bolehUbah(user, ada.createdById)) return { error: "Anda tidak berhak mengubah data ini" };
    await prisma.alatRadiologi.update({ where: { id }, data });
  } else {
    await prisma.alatRadiologi.create({ data: { ...data, createdById: user.id } });
  }

  revalidatePath("/alat");
  redirect("/alat");
}

export async function hapusAlat(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");

  const ada = await prisma.alatRadiologi.findUnique({ where: { id } });
  if (!ada || !bolehUbah(user, ada.createdById)) redirect("/alat?error=terlarang");

  const jumlahLaporan = await prisma.laporan.count({ where: { alatRadiologiId: id } });
  if (jumlahLaporan > 0) {
    redirect("/alat?error=terpakai");
  }
  await prisma.alatRadiologi.delete({ where: { id } });
  revalidatePath("/alat");
}

/* ---------------- Registry Alat Ukur ---------------- */

export async function simpanAlatUkur(
  _prev: AksiState,
  fd: FormData,
): Promise<AksiState> {
  const user = await requireUser();
  const id = teks(fd, "id");
  const nama = teks(fd, "nama");
  if (!nama) return { error: "Nama alat ukur wajib diisi" };

  const data = {
    nama,
    merek: teks(fd, "merek"),
    modelTipe: teks(fd, "modelTipe"),
    noSeri: teks(fd, "noSeri"),
    tertelusurKe: teks(fd, "tertelusurKe"),
    masaKalibrasiSampai: tanggal(fd, "masaKalibrasiSampai"),
  };

  if (id) {
    const ada = await prisma.alatUkur.findUnique({ where: { id } });
    if (!ada) return { error: "Alat ukur tidak ditemukan" };
    if (!bolehUbah(user, ada.createdById)) return { error: "Anda tidak berhak mengubah data ini" };
    await prisma.alatUkur.update({ where: { id }, data });
  } else {
    await prisma.alatUkur.create({ data: { ...data, createdById: user.id } });
  }

  revalidatePath("/alat-ukur");
  redirect("/alat-ukur");
}

export async function hapusAlatUkur(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");

  const ada = await prisma.alatUkur.findUnique({ where: { id } });
  if (!ada || !bolehUbah(user, ada.createdById)) redirect("/alat-ukur?error=terlarang");

  await prisma.alatUkur.delete({ where: { id } });
  revalidatePath("/alat-ukur");
}
