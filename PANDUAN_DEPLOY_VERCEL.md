# Panduan Deploy ke Vercel

Panduan langkah demi langkah untuk menaruh aplikasi ini online di akun Vercel Anda
sendiri. Ditulis untuk dikerjakan dari nol — tiap langkah disertai alasannya, bukan
sekadar daftar perintah.

Perkiraan waktu: 30–45 menit untuk pertama kali.

---

## Gambaran alurnya dulu

Supaya tidak bingung di tengah jalan, ini peta besarnya:

```
Kode di laptop  →  GitHub  →  Vercel  →  Website online
                                 ↑
                          Database Postgres
```

Vercel tidak menyimpan kode Anda. Vercel **membaca** kode dari GitHub, membangunnya,
lalu menjalankannya. Jadi urutannya selalu: kode masuk GitHub dulu, baru Vercel bisa
memakainya. Setelah tersambung sekali, tiap kali Anda `git push`, Vercel otomatis
membangun ulang dan menerbitkan versi baru.

Database berdiri terpisah dari keduanya. Vercel hanya diberi alamat sambungannya.

---

## Kenapa database harus diganti dulu

Selama ini aplikasi memakai SQLite — database yang berbentuk satu file (`dev.db`) di
folder proyek. Itu enak untuk lokal, tapi **tidak bisa dipakai di Vercel**, karena:

1. Filesystem di Vercel bersifat *read-only* — aplikasi tidak boleh menulis file.
2. Tiap permintaan bisa dilayani instance server yang berbeda, dan tiap instance
   dimulai dari salinan kode yang bersih. Data yang tertulis akan hilang.

Jadi database harus berupa layanan terpisah yang bisa dihubungi lewat jaringan.
Pilihan yang dipakai di panduan ini: **Postgres**.

Kodenya sudah saya siapkan — `prisma/schema.prisma` sekarang memakai
`provider = "postgresql"`. Yang belum ada tinggal databasenya sendiri.

---

## Langkah 1 — Siapkan akun

Anda butuh dua akun, keduanya gratis:

1. **GitHub** — <https://github.com/signup>
2. **Vercel** — <https://vercel.com/signup>, pilih **Continue with GitHub**

Mendaftar Vercel lewat GitHub sekalian memberi Vercel izin membaca repository Anda,
jadi nanti tidak perlu menyambungkan manual.

> Lakukan pendaftaran sendiri lewat browser. Jangan bagikan kata sandi ke siapa pun.

---

## Langkah 2 — Buat database Postgres

Ada dua jalur. Pilih salah satu.

### Jalur A — lewat Vercel (paling sedikit langkah)

1. Buka <https://vercel.com/dashboard>
2. Tab **Storage** → **Create Database** → pilih **Neon** (Serverless Postgres)
3. Beri nama, misal `kalibrasi-radiologi-db`, pilih region terdekat
   (Singapore paling dekat dari Indonesia)
4. Setelah jadi, buka tab **`.env.local`** atau **Connect**, salin nilai
   **`DATABASE_URL`**

Kelebihannya: begitu database ini di-*connect* ke project Vercel Anda nanti,
environment variable-nya terisi otomatis.

### Jalur B — langsung ke Neon

1. Daftar di <https://neon.tech>
2. **Create project** → beri nama → pilih region Singapore
3. Salin **Connection string** yang berbentuk seperti:

```
postgresql://user:password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

> Connection string ini berisi kata sandi database. Perlakukan seperti kata sandi:
> jangan ditulis di chat, jangan di-commit ke GitHub, jangan ditempel di Google Docs.
> File `.env` sudah masuk `.gitignore` sehingga tidak akan ikut ter-upload.

---

## Langkah 3 — Sambungkan database ke laptop Anda

Buka file `.env` di folder proyek, ganti nilai `DATABASE_URL` dengan connection string
tadi.

Lalu buat `AUTH_SECRET` baru. Ini kunci acak yang dipakai untuk menandatangani cookie
sesi login — kalau bocor, orang bisa memalsukan sesi. Buat dengan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Salin hasilnya ke `AUTH_SECRET` di `.env`. Isi akhirnya kira-kira begini:

```
DATABASE_URL="postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
AUTH_SECRET="hasil-acak-dari-perintah-di-atas"
AUTH_TRUST_HOST=true
```

---

## Langkah 4 — Buat tabel di database baru

Database yang baru dibuat masih kosong. Perintah berikut membaca
`prisma/schema.prisma` dan membuat seluruh tabelnya, sekaligus menyimpan riwayat
perubahan struktur di folder `prisma/migrations/`:

```bash
npx prisma migrate dev --name init
```

Folder `prisma/migrations/` itu penting — nanti Vercel memakainya untuk membuat tabel
yang sama di produksi. Jangan dihapus, dan ikut di-commit ke GitHub.

Isi data contoh (opsional, tapi berguna supaya aplikasi tidak kosong saat dilihat orang):

```bash
npm run db:seed
```

Cek aplikasinya masih jalan seperti biasa:

```bash
npm run dev
```

Buka <http://localhost:3000>. Kalau bisa login dan laporan contoh muncul, artinya
sambungan ke Postgres sudah benar. Hentikan dengan `Ctrl+C`.

---

## Langkah 5 — Masukkan kode ke Git

> **Penting.** Jalankan perintah di bawah **di dalam folder `kalibrasi-radiologi`**,
> bukan di folder induknya (`MAGANG 6 BULAN`). Folder induk berisi PDF sertifikat,
> proposal, dan berkas DICOM pasien — semua itu tidak boleh ikut ter-upload ke GitHub.

Siapkan identitas Git (sekali seumur hidup, kalau belum pernah):

```bash
git config --global user.name "Nama Anda"
```

```bash
git config --global user.email "email@anda.com"
```

Buat repository lokal:

```bash
git init -b main
```

Cek dulu apa saja yang akan ikut — pastikan **tidak ada** `.env`, `node_modules`,
atau `.next` di daftarnya:

```bash
git status --short
```

Kalau sudah aman, simpan:

```bash
git add .
```

```bash
git commit -m "Aplikasi kalibrasi alat radiologi - 6 modalitas"
```

---

## Langkah 6 — Kirim ke GitHub

1. Buka <https://github.com/new>
2. **Repository name**: `kalibrasi-radiologi`
3. **Private** kalau belum ingin dilihat umum, **Public** kalau tidak masalah
   (deploy Vercel tetap bisa dilihat siapa saja di kedua pilihan — yang berbeda
   hanya kode sumbernya)
4. **Jangan** centang "Add a README file" — repo harus kosong supaya tidak bentrok
5. **Create repository**

GitHub akan menampilkan alamat repo Anda. Sambungkan dan kirim:

```bash
git remote add origin https://github.com/USERNAME/kalibrasi-radiologi.git
```

```bash
git push -u origin main
```

Ganti `USERNAME` dengan username GitHub Anda. Saat diminta kata sandi, GitHub sekarang
minta **Personal Access Token**, bukan kata sandi akun — buat di
<https://github.com/settings/tokens> (Tokens classic → Generate new token → centang
scope `repo`).

Refresh halaman repo. Kalau file-file proyek sudah muncul, berhasil.

---

## Langkah 7 — Hubungkan ke Vercel

1. Buka <https://vercel.com/new>
2. Cari repo `kalibrasi-radiologi` → **Import**
3. Vercel otomatis mengenali ini project Next.js. Framework Preset, Build Command,
   dan Output Directory **biarkan apa adanya** — proyek ini punya script
   `vercel-build` di `package.json` yang otomatis dipakai Vercel:

   ```
   prisma generate && prisma migrate deploy && next build
   ```

   Artinya tiap kali deploy, Vercel akan membuat/menyesuaikan tabel di database
   produksi dulu, baru membangun aplikasinya. Anda tidak perlu menjalankan migrasi
   manual ke produksi.

4. Buka bagian **Environment Variables**, isi tiga variabel berikut:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | connection string Postgres dari Langkah 2 |
   | `AUTH_SECRET` | hasil acak dari Langkah 3 |
   | `AUTH_TRUST_HOST` | `true` |
   | `ADMIN_EMAILS` | email akun admin pertama Anda (boleh lebih dari satu, dipisah koma) |

   `ADMIN_EMAILS` hanya menjamin adanya admin pertama. Setelah itu peran akun
   diatur dari dalam aplikasi lewat **Profil → Fismed**.

   Kalau tadi memakai Jalur A dan database sudah di-*connect* ke project ini,
   `DATABASE_URL` mungkin sudah terisi sendiri — cukup pastikan namanya persis
   `DATABASE_URL`.

5. **Deploy**

Tunggu 1–3 menit. Kalau berhasil, Anda dapat alamat seperti
`https://kalibrasi-radiologi.vercel.app`.

---

## Langkah 8 — Coba hasilnya

1. Buka alamat Vercel tadi
2. Kalau database produksi masih kosong, klik **Buat Akun** dan daftar
3. Coba buat satu laporan, lalu buka **Pratinjau & Export PDF** dan cetak ke PDF

Kalau ingin data contoh ikut masuk ke produksi, jalankan seed dari laptop dengan
`DATABASE_URL` yang mengarah ke database produksi — yang memang sudah begitu kalau
Anda memakai satu database untuk lokal dan produksi:

```bash
npm run db:seed
```

---

## Setelah ini: alur update

Sekarang deploy jadi otomatis. Tiap kali ada perubahan kode:

```bash
git add .
```

```bash
git commit -m "penjelasan singkat perubahannya"
```

```bash
git push
```

Vercel mendeteksi push itu, membangun ulang, dan menerbitkan versi barunya sendiri.
Riwayatnya bisa dilihat di tab **Deployments**, dan kalau ada yang rusak, versi lama
bisa dikembalikan lewat **Instant Rollback**.

Kalau nanti Anda mengubah `prisma/schema.prisma`, jalankan dulu di lokal:

```bash
npx prisma migrate dev --name jelaskan_perubahannya
```

lalu commit folder `prisma/migrations/` yang ikut berubah. Vercel akan menerapkannya
ke produksi lewat `prisma migrate deploy` saat deploy berikutnya.

---

## Kalau gagal

Buka tab **Deployments** di Vercel, klik deployment yang merah, lalu baca
**Build Logs**. Pesan errornya hampir selalu langsung menunjuk penyebabnya.

| Gejala | Penyebab yang paling sering |
|---|---|
| `Environment variable not found: DATABASE_URL` | Env var belum diisi, atau salah ketik namanya. Cek Settings → Environment Variables |
| `Can't reach database server` | Connection string salah, atau kurang `?sslmode=require` di akhirnya |
| `PrismaClientInitializationError` saat runtime | `prisma generate` tidak jalan. Pastikan script `postinstall` di `package.json` masih ada |
| Login selalu gagal padahal kata sandi benar | `AUTH_SECRET` belum diisi, atau berbeda antara build dan runtime |
| Halaman blank / 500 | Buka tab **Logs** di Vercel (runtime log, beda dari build log) |

Setelah mengubah environment variable, **deployment harus diulang** supaya nilainya
terpakai — Deployments → klik yang terakhir → **Redeploy**.

---

## Catatan penting sebelum dibagikan luas

Pendaftaran bersifat mandiri: siapa pun yang tahu alamatnya bisa membuat akun.

Sejak pemisahan data per akun diterapkan, akun baru **hanya melihat data buatannya
sendiri** dan tidak bisa menyentuh data Fismed lain. Jadi orang asing yang mendaftar
hanya mendapat halaman kosong — tidak bisa melihat maupun mengubah laporan Anda.

Yang masih terbuka: siapa pun tetap bisa **membuat akun** dan memakai aplikasinya
untuk datanya sendiri. Kalau itu tidak dikehendaki, tambahkan pembatas:

- kode undangan yang harus diisi saat mendaftar,
- pembatasan domain email yang boleh mendaftar, atau
- Vercel **Deployment Protection** (Settings → Deployment Protection → Password
  Protection) supaya seluruh situs perlu kata sandi untuk dibuka. Ini yang paling
  cepat karena tidak perlu ubah kode, tapi Password Protection pada production
  deployment memerlukan paket Vercel Pro.

Ingat juga bahwa laporan yang dihasilkan aplikasi ini berstatus laporan kerja
internal, bukan sertifikat resmi berlegalitas BAPETEN/BPAFK.
