"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type FormState = { error?: string; ok?: boolean };

const skemaDaftar = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter"),
  gelar: z.string().trim().optional(),
  nip: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
});

export async function daftar(_prev: FormState, formData: FormData): Promise<FormState> {
  const hasil = skemaDaftar.safeParse({
    nama: formData.get("nama"),
    gelar: formData.get("gelar"),
    nip: formData.get("nip"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!hasil.success) {
    return { error: hasil.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const { nama, gelar, nip, email, password } = hasil.data;

  const sudahAda = await prisma.user.findUnique({ where: { email } });
  if (sudahAda) {
    return {
      error: sudahAda.passwordHash
        ? "Email ini sudah terdaftar. Silakan masuk."
        : "Email ini sudah terdaftar lewat Google. Masuklah dengan tombol Google.",
    };
  }

  await prisma.user.create({
    data: {
      nama,
      gelar: gelar || null,
      nip: nip || null,
      email,
      passwordHash: await hash(password, 10),
    },
  });

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch {
    return { ok: true, error: "Akun dibuat, tetapi login otomatis gagal. Silakan masuk manual." };
  }

  redirect("/dashboard");
}

export async function masuk(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email dan kata sandi wajib diisi" };

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Email atau kata sandi salah" };
    throw e;
  }

  redirect("/dashboard");
}

/**
 * Mulai alur masuk dengan Google.
 *
 * `signIn` menyelesaikan dirinya dengan melempar redirect ke Google, jadi
 * jangan pernah membungkusnya dengan try/catch yang menelan error — redirect-nya
 * ikut tertelan dan pengguna hanya melihat halaman yang diam saja. Kegagalan di
 * sisi Google ditangani lewat `pages.error` di src/auth.ts, yang mengembalikan
 * pengguna ke /masuk dengan parameter ?error=.
 */
export async function masukGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function keluar() {
  await signOut({ redirectTo: "/masuk" });
}

const skemaProfil = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter"),
  gelar: z.string().trim().optional(),
  nip: z.string().trim().optional(),
});

export async function simpanProfil(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const hasil = skemaProfil.safeParse({
    nama: formData.get("nama"),
    gelar: formData.get("gelar"),
    nip: formData.get("nip"),
  });
  if (!hasil.success) return { error: hasil.error.issues[0]?.message ?? "Data tidak valid" };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      nama: hasil.data.nama,
      gelar: hasil.data.gelar || null,
      nip: hasil.data.nip || null,
    },
  });

  return { ok: true };
}
