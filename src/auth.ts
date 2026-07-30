import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { emailMaster } from "@/lib/peran";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nama: string;
      gelar: string | null;
      nip: string | null;
      email: string;
      /** "fismed" | "admin" | "master" */
      peran: string;
      /** admin ATAU master — boleh membuka data milik Fismed lain */
      admin: boolean;
      /** master — boleh mengatur peran dan menghapus akun */
      master: boolean;
    };
  }
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
    async jwt({ token, user }) {
      if (user) token.uid = (user as { id: string }).id;
      // Profil dan peran selalu diambil ulang dari database, supaya perubahan
      // nama/gelar dan naik/turun peran langsung terasa tanpa perlu login ulang.
      if (token.uid) {
        let db = await prisma.user.findUnique({
          where: { id: token.uid as string },
        });

        // Peran master disinkronkan dari MASTER_EMAILS setiap login: yang
        // terdaftar dinaikkan, yang sudah dikeluarkan dari daftar diturunkan
        // jadi admin biasa.
        if (db) {
          const seharusnyaMaster = emailMaster(db.email);
          if (seharusnyaMaster && db.peran !== "master") {
            db = await prisma.user.update({
              where: { id: db.id },
              data: { peran: "master" },
            });
          } else if (!seharusnyaMaster && db.peran === "master") {
            db = await prisma.user.update({
              where: { id: db.id },
              data: { peran: "admin" },
            });
          }
        }

        // Akun sudah tidak ada di database — batalkan sesinya, jangan biarkan
        // cookie lama tetap berlaku.
        if (!db) return null;

        token.nama = db.nama;
        token.gelar = db.gelar;
        token.nip = db.nip;
        token.email = db.email;
        token.peran = db.peran;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.uid as string,
        nama: (token.nama as string) ?? "",
        gelar: (token.gelar as string | null) ?? null,
        nip: (token.nip as string | null) ?? null,
        email: (token.email as string) ?? "",
        peran: (token.peran as string) ?? "fismed",
        admin: token.peran === "admin" || token.peran === "master",
        master: token.peran === "master",
      };
      return session;
    },
  },
});
