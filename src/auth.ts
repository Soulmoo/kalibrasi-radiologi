import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { googleAktif } from "@/lib/oauth";
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

/**
 * Cookie sesi yang tidak bisa didekripsi bukan keadaan darurat.
 *
 * Terjadi setiap kali AUTH_SECRET berganti — rotasi kunci, pindah environment,
 * atau .env lokal yang isinya berbeda dari produksi. Cookie lama masih ada di
 * browser, tapi kuncinya sudah bukan yang itu lagi, jadi Auth.js melempar
 * "no matching decryption secret" (lihat node_modules/@auth/core/jwt.js).
 *
 * Auth.js sendiri sudah menanganinya dengan benar: sesi dianggap tidak ada dan
 * pengguna tinggal masuk lagi. Yang mengganggu, pesannya keluar lewat
 * console.error sehingga Next.js memunculkan overlay error merah seolah
 * aplikasinya rusak. Dan karena `auth()` di aplikasi ini selalu dipanggil dari
 * Server Component — yang tidak boleh menulis cookie — cookie basi itu tidak
 * bisa dibuang Auth.js, sehingga pesannya terulang di SETIAP request sampai
 * pengguna masuk lagi.
 *
 * Jadi khusus kasus ini diturunkan jadi satu baris peringatan yang menjelaskan
 * cara menyelesaikannya. Error auth lain tetap dilaporkan apa adanya.
 */
const logger = {
  error(error: Error) {
    if ((error as { type?: string }).type === "JWTSessionError") {
      console.warn(
        "[auth] Cookie sesi lama tidak bisa dibaca dengan AUTH_SECRET yang " +
          "sekarang — sesi diabaikan. Masuk kembali untuk mendapat cookie baru.",
      );
      return;
    }
    console.error(error);
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  logger,
  // Kegagalan OAuth diarahkan balik ke halaman masuk kita sendiri, bukan ke
  // halaman error bawaan Auth.js, supaya pesannya berbahasa Indonesia dan
  // pengguna langsung bisa mencoba jalur email+sandi.
  pages: { signIn: "/masuk", error: "/masuk" },
  providers: [
    ...(googleAktif() ? [Google] : []),
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

        // Akun yang dibuat lewat Google tidak punya kata sandi. Tanpa
        // penjagaan ini, jalur email+sandi bisa dipakai untuk menebak-nebak
        // akun Google orang lain.
        if (!user.passwordHash) return null;

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
    /**
     * Google hanya diterima kalau emailnya sudah diverifikasi Google.
     *
     * Ini penjagaan yang menentukan. Akun Google dan akun email+sandi
     * disatukan berdasarkan alamat email (lihat callback `jwt` di bawah), jadi
     * kalau email yang belum terverifikasi ikut diterima, siapa pun yang
     * mendaftarkan alamat email milik Fismed lain di Google bisa mengambil alih
     * akunnya. Dengan email_verified, Google sudah memastikan orang itu memang
     * pemilik alamatnya.
     */
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      return profile?.email_verified === true && typeof profile.email === "string";
    },

    async jwt({ token, user, account, profile }) {
      // Masuk lewat Google. Akun dicocokkan berdasarkan email: kalau Fismed
      // sudah punya akun email+sandi dengan alamat yang sama, Google menempel
      // ke akun yang sudah ada itu — bukan membuat akun kedua yang datanya
      // terpisah. `update: {}` menjaga nama, gelar, dan NIP yang sudah disunting
      // Fismed supaya tidak tertimpa data profil Google.
      if (account?.provider === "google" && profile?.email) {
        const email = profile.email.trim().toLowerCase();
        const db = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, nama: profile.name?.trim() || email },
        });
        token.uid = db.id;
      } else if (user) {
        token.uid = (user as { id: string }).id;
      }

      if (!token.uid) return token;

      // Profil dan peran selalu diambil ulang dari database, supaya perubahan
      // nama/gelar dan naik/turun peran langsung terasa tanpa perlu login ulang.
      //
      // Callback ini dijalankan Auth.js di dalam try/catch milik pembacaan
      // sesi, dan APA PUN yang dilempar dari sini membuat cookie sesi dibuang —
      // pengguna tiba-tiba keluar. Padahal database di Neon bisa sesekali gagal
      // menyambung karena baru bangun dari idle. Fismed yang sedang mengetik
      // hasil pengukuran di form panjang akan kehilangan isian yang belum
      // tersimpan hanya karena satu koneksi meleset. Jadi kegagalan query
      // ditangani di sini: sesi dipertahankan apa adanya, profil dan peran
      // memakai nilai dari penyegaran terakhir yang berhasil.
      let db;
      try {
        db = await prisma.user.findUnique({ where: { id: token.uid as string } });

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
      } catch (e) {
        console.error("[auth] Gagal menyegarkan profil dari database:", e);
        return token;
      }

      // Beda dengan kegagalan query di atas: query-nya berhasil dan akunnya
      // memang sudah tidak ada — dihapus master lewat Profil → Fismed. Sesinya
      // dibatalkan supaya cookie lama tidak tetap berlaku.
      if (!db) return null;

      token.nama = db.nama;
      token.gelar = db.gelar;
      token.nip = db.nip;
      token.email = db.email;
      token.peran = db.peran;
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
