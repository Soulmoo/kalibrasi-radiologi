import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nama: string;
      gelar: string | null;
      nip: string | null;
      email: string;
      /** akun master: bisa melihat & mengubah data milik semua Fismed */
      admin: boolean;
    };
  }
}

/**
 * Daftar email akun master, diambil dari environment variable ADMIN_EMAILS
 * (dipisah koma). Sengaja tidak disimpan di database supaya bisa diubah lewat
 * dashboard Vercel tanpa perlu migrasi atau deploy ulang kode.
 */
function daftarAdmin(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function emailAdalahAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return daftarAdmin().includes(email.trim().toLowerCase());
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/masuk" },
  providers: [
    Credentials({
      name: "Email & Kata Sandi",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata Sandi", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const cocok = await compare(password, user.passwordHash);
        if (!cocok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nama,
          nama: user.nama,
          gelar: user.gelar,
          nip: user.nip,
        } as never;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) token.uid = (user as { id: string }).id;
      // Ambil ulang profil dari DB supaya perubahan nama/gelar langsung terpakai
      // di kolom tanda tangan laporan.
      if (token.uid && (user || trigger === "update" || !token.nama)) {
        const db = await prisma.user.findUnique({
          where: { id: token.uid as string },
        });
        if (db) {
          token.nama = db.nama;
          token.gelar = db.gelar;
          token.nip = db.nip;
          token.email = db.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      const email = (token.email as string) ?? "";
      session.user = {
        ...session.user,
        id: token.uid as string,
        nama: (token.nama as string) ?? "",
        gelar: (token.gelar as string | null) ?? null,
        nip: (token.nip as string | null) ?? null,
        email,
        admin: emailAdalahAdmin(email),
      };
      return session;
    },
  },
});
