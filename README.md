# Aplikasi Bantu Kalkulasi & Penulisan Hasil Kalibrasi Alat Radiologi

Alat bantu kerja internal untuk fisikawan medis: input hasil ukur → sistem menghitung
parameter turunan dan mengevaluasi lolos/tidak lolos → laporan diekspor jadi PDF
print-ready dengan kolom tanda tangan Fismed.

Implementasi dari `PRD_Aplikasi_Kalibrasi_Radiologi.md` (v0.5).

> Laporan yang dihasilkan berstatus **laporan kerja internal**, bukan sertifikat resmi
> berlegalitas BAPETEN/BPAFK. Tidak ada tanda tangan elektronik bersertifikat, nomor
> sertifikat berpola resmi, atau watermark larangan kutip.

## Menjalankan secara lokal

Aplikasi ini memakai **Postgres**, baik untuk lokal maupun produksi, supaya perilaku
keduanya persis sama. Siapkan satu database gratis di [Neon](https://neon.tech) atau
lewat Vercel Storage, lalu salin `.env.example` menjadi `.env` dan isi `DATABASE_URL`
serta `AUTH_SECRET`.

```bash
npm install
```

```bash
npx prisma migrate dev --name init
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Buka <http://localhost:3000>. Akun contoh dari seed: `fismed@contoh.local` / `kalibrasi123`.
Atau buat akun sendiri lewat halaman **Buat Akun**.

Langkah lengkap dari nol sampai online ada di
[PANDUAN_DEPLOY_VERCEL.md](PANDUAN_DEPLOY_VERCEL.md).

## Isi data contoh

`npm run db:seed` mengisi satu instansi (RS Premier Surabaya), lima belas alat ukur, dan
**enam laporan lengkap** yang angkanya diambil langsung dari keenam dokumen BPAFK
referensi. Gunanya untuk membandingkan hasil hitung sistem dengan angka di dokumen asli —
lihat bagian Validasi Rumus di bawah.

## Cakupan versi ini

Seluruh modalitas MVP di PRD 5.1 sudah tercakup:

| Modalitas | Metode kerja | Dokumen referensi |
|---|---|---|
| Radiografi Mobile / Umum | MK-PRUK-02 | `I/UK/B-01` |
| CT-Scan | MK-PRUK-06 | `I/PK/C-01` |
| Gigi Panoramic & Cephalometric | MK-PRUK-04 | `I/PK/D-01` |
| Angiografi / Cath Lab | MK-PRUK-05 | `I/PK/F-03` |
| C-Arm | MK-PRUK-05 | `I/PK/F-01` |
| MRI | MK-PRUK-10 | `I/PK/MRI-01` |

USG masih ditunda sampai parameter ujinya tersedia dari BPAFK (PRD 5.1).

**Radiografi Mobile dan C-Arm diperlakukan sebagai kalibrasi**, bukan uji kesesuaian.
Parameter ujinya sama seperti dokumen uji kesesuaian aslinya, tetapi judul, tujuan, dan
seluruh label dokumen memakai istilah kalibrasi. Tidak ada jenis dokumen "Uji Kesesuaian"
di aplikasi ini (PRD 5.2).

## Struktur kode

```
prisma/schema.prisma        model data (User, Instansi, AlatRadiologi, AlatUkur, Laporan)
prisma/seed.ts              data contoh dari dokumen referensi
src/auth.ts                 Auth.js v5 — credentials (email + kata sandi), sesi JWT
src/lib/calc.ts             seluruh rumus kalkulasi + tabel HVL BAPETEN
src/lib/evaluasi.ts         menjalankan template atas data → nilai terhitung + verdict
src/lib/templates/          satu file per modalitas + tipe skema template
src/components/lembar.tsx   komponen render laporan siap cetak
src/app/(app)/              halaman aplikasi (butuh login)
```

### Menambah modalitas baru

1. Buat `src/lib/templates/<modalitas>.ts` mengikuti pola `ct-scan.ts`.
2. Daftarkan di `src/lib/templates/index.ts`.

Form input, kalkulasi otomatis, evaluasi pass/fail, dan layout PDF semuanya dibangkitkan
dari skema template — tidak ada komponen form atau halaman PDF yang perlu ditulis ulang
per modalitas (PRD bagian 8: skema terkonfigurasi, bukan hard-code).

Angiografi dan C-Arm memakai struktur laporan yang sama, sehingga bagian bersamanya
tinggal di `fluoroskopi.ts` dan dipanggil kedua template; C-Arm menambah satu seksi
parameter khususnya sendiri.

Tipe skema ada di `src/lib/templates/types.ts`. Yang perlu diketahui:

- `Blok.modeBaris: "tetap"` → baris ditentukan template; `"dinamis"` → Fismed bisa
  tambah/hapus baris sendiri.
- `Kolom.jenis: "hitung"` → nilai dihitung sistem lewat fungsi `hitung()`.
- `Blok.evaluasi()` → verdict per baris; `Blok.ringkasanBlok()` → hasil hitung lintas
  baris (CL, CV, ΔCT, dan sejenisnya).
- `Kolom.desimal` → ketelitian tampilan kolom hitung (lihat bagian di bawah).
- `Kolom.hanyaForm` → kolom bantu yang tidak ikut tercetak di PDF.
- `Blok.opsional` → blok alat bantu yang disembunyikan dari PDF kalau kosong.

## Export PDF

Halaman `/laporan/[id]/cetak` merender laporan dalam layout A4 dengan `@page` dan
`@media print`. Tombol **Cetak / Simpan sebagai PDF** memanggil dialog cetak browser —
pilih tujuan "Save as PDF", ukuran A4, dan matikan header/footer bawaan browser.

Pendekatan ini dipilih supaya tidak perlu Puppeteer/Chromium di serverless Vercel, dan
supaya layout PDF selalu identik dengan yang terlihat di layar.

## Jumlah angka di belakang koma

Ketelitian tampilan diatur **per parameter**, mengikuti cara penulisan di dokumen BPAFK —
bukan disamaratakan. Contoh: kesalahan relatif 1 desimal (`-3.6 %`), keluaran radiasi
4 desimal (`0.0260 mGy/mAs`), CV dan CL 3 desimal (`0.001`), jumlah spoke MRI bilangan
bulat (`37`).

Alasannya, kalau semua dipaksa 2 desimal, koefisien tak berdimensi jadi kehilangan arti:
CV `0.001` membulat menjadi `0.00` dan GR `0.007` menjadi `0.01` padahal batasnya 0.025.

Aturannya:

- Kolom hitung memakai properti `desimal` di definisi templatenya.
- Hasil hitung tingkat blok memanggil `fmt(nilai, n)` dengan n-nya sendiri.
- Kolom hitung yang tidak menentukan `desimal` memakai `DESIMAL_TAMPILAN`
  (default 2) di `src/lib/calc.ts`.
- Nilai yang diketik Fismed ditampilkan apa adanya — sistem tidak membulatkan input, supaya
  pembacaan alat ukur tidak berubah arti (mis. bacaan waktu 0.0998 s pada uji
  reprodusibilitas).

## Validasi rumus (PRD Fase 0 — belum selesai)

Rumus mengikuti PRD Lampiran A. Hasil pengecekan terhadap keenam dokumen referensi:

| Modalitas | Parameter | Sistem | Dokumen |
|---|---|---|---|
| Radiografi Mobile | Δ kolimasi X / Y | 1.2 % / 1.5 % | 1.2 % / 1.5 % |
| Radiografi Mobile | Koefisien linier CL | 0.010 | 0.01 |
| Radiografi Mobile | CV kVp / waktu / output | 0.001 / 0.002 / 0.002 | idem |
| Radiografi Mobile | Rerata kVp / waktu / dosis | 68.710 / 0.100 / 0.530 | 68.71 / 0.10 / 0.53 |
| CT-Scan | Keluaran per 100 mAs | 35.70 | 35.7 |
| CT-Scan | Deviasi CTDIvol | 5.2 % | 5.2 % |
| CT-Scan | CT pusat / Δ CT / noise tepi | −0.10 / 1.64 / 0.40 | −0.1 / 1.64 / 0.40 |
| Gigi | Kesalahan relatif kVp (60–84) | −3.3 … −3.1 % | −3.4 … −3.1 % |
| Gigi | SSD | 155 cm (lolos ≥ 150) | 155 cm |
| Angiografi | Δ kolimasi II / monitor | −1.0 % / 0.2 % | −1.0 % / 0.2 % |
| Angiografi | Laju dosis normal / tinggi / tipikal | 44.06 / 92.14 / 1.56 | idem |
| C-Arm | Δ kolimasi II / display | 0.2 % / 0.5 % | 0.2 % / 0.4 % |
| MRI | PIU T1 / T2 | 82.0 % / 85.6 % | 82.0 % / 85.6 % |
| MRI | Tebal irisan T1 / T2 | 4.93 / 5.02 mm | 4.93 / 5.02 mm |
| MRI | SNR ternormalisasi T1 / T2 | 74.7 / 195.2 | 74.8 / 195.0 |
| MRI | Percent signal ghosting T1 / T2 | 0.007 / 0.009 | 0.007 / 0.009 |
| MRI | Jumlah spoke | 37 | 37 |

Selisih kecil pada beberapa baris berasal dari pembulatan bacaan alat di dokumen sumber
(dokumen menampilkan bacaan yang sudah dibulatkan, tetapi menghitung dari nilai penuh).

**Faktor 0.655 pada SNR MRI perlu dikonfirmasi.** Rasio sinyal/derau mentah di dokumen
tidak sama dengan nilai SNR yang tertulis; selisihnya konsisten pada faktor 0.655–0.656,
yaitu koreksi sebaran Rayleigh NEMA MS 1 untuk derau latar pada citra magnitudo. Faktor
ini dipakai di `snr()` pada `src/lib/calc.ts` — mohon dicek terhadap MK-PRUK-10.

**Satu perbedaan yang perlu keputusan Fismed — konvensi tanda kesalahan relatif.**
Dokumen sumber BPAFK sendiri tidak konsisten: C-Arm, Angiografi, dan Gigi memakai
`(terukur − set)/set`, sedangkan CT-Scan dan Radiografi Mobile menampilkan tanda yang
terbalik dari itu. Aplikasi ini memakai satu konvensi baku sesuai PRD Lampiran A.1.1:

```
e = (terukur − set) / set × 100 %
```

Konsekuensinya, pada laporan contoh Radiografi Mobile sistem menulis `−3.6 %` di mana
dokumen aslinya menulis `3.5 %` — besarnya sama (selisih 0.1 hanya efek pembulatan
bacaan), yang berbeda hanya tandanya. Kalau BPAFK menghendaki konvensi berbeda per
modalitas, ubah pemanggilan `kesalahanRelatif()` di file template terkait.

Parameter yang sengaja **tidak** dihitung otomatis, sesuai rekomendasi Lampiran A:

- **HVL** — diterima sebagai input langsung dari multimeter; sistem hanya mengevaluasi
  terhadap batas minimum. Batas terisi otomatis dari tabel BAPETEN sesuai kVp dan tetap
  bisa ditimpa manual.
- **Kebocoran wadah tabung** — input manual penuh; rumus ekstrapolasinya belum bisa
  diverifikasi.
- **Keseragaman noise antar ROI tepi (CT)** — dihitung sebagai selisih SD tertinggi dan
  terendah antar ROI tepi. Perlu dikonfirmasi apakah definisinya sama dengan MK-PRUK-06.
- **Laju dosis permukaan kulit & laju dosis input II (fluoroskopi)** — pembacaan langsung
  dosimeter, sistem hanya mengevaluasi terhadap batas.
- **Resolusi spasial MRI, ambang kontras rendah, dan distorsi jaring (C-Arm)** —
  pembacaan observasional dari test tool/fantom, bukan hasil rumus.

Parameter tambahan C-Arm (waktu fluoroskopik maksimum, laju dosis input II, kualitas citra
monitor) tidak ada di dokumen C-Arm referensi tetapi tercantum di PRD 6.2. Blok-bloknya
tersedia di form dengan batas lolos uji yang diisi manual, dan **tidak ikut tercetak di
PDF kalau dibiarkan kosong** — jadi laporan tetap identik dengan dokumen sumber bila
parameter itu tidak diuji.

## Deploy ke Vercel

Panduan lengkap langkah demi langkah: **[PANDUAN_DEPLOY_VERCEL.md](PANDUAN_DEPLOY_VERCEL.md)**.

Ringkasnya:

1. Buat database Postgres (Neon atau Vercel Storage).
2. Push kode ke GitHub, lalu import reponya di <https://vercel.com/new>.
3. Isi environment variable `DATABASE_URL`, `AUTH_SECRET`, dan `AUTH_TRUST_HOST=true`.
4. Deploy.

Migrasi database dijalankan otomatis saat build lewat script `vercel-build` di
`package.json` (`prisma generate && prisma migrate deploy && next build`), jadi tidak
perlu menjalankan `prisma migrate deploy` manual ke produksi.

## Kepemilikan data, peran, & halaman admin

Setiap Fismed **hanya melihat data yang dia buat sendiri** — instansi, alat radiologi,
alat ukur, dan laporan. Akun baru mulai dari keadaan kosong. Ini berlaku juga untuk admin:
dashboard dan daftar riwayat tetap berisi pekerjaan sendiri, supaya ruang kerjanya tidak
tercampur.

Akses lintas Fismed ada di satu tempat saja: **Profil → Fismed** (muncul untuk admin dan
master). Di sana tersedia daftar seluruh akun dan halaman per Fismed yang menampilkan
laporan apa saja yang sudah dia kalibrasi beserta tautan untuk membuka dan mencetaknya.
Tombol atur peran dan hapus akun hanya muncul untuk master.

**Akses lintas Fismed bersifat baca-saja.** Admin dan master bisa membuka dan mencetak
laporan Fismed lain, tetapi tidak menyuntingnya: yang dirender bukan form melainkan
tabel hasil hitung, sama seperti yang tercetak di PDF. Alasannya, isi laporan adalah
hasil pengukuran yang sangat personal bagi Fismed yang mengerjakannya — angka bacaan
alat, kondisi lingkungan saat uji, dan catatan lapangannya. Orang lain tidak punya dasar
untuk mengubah angka-angka itu.

### Tiga peran

| Peran | Data sendiri | Buka laporan Fismed lain | Sunting laporan Fismed lain | Atur peran & hapus akun |
|---|---|---|---|---|
| **Fismed** | ✓ | – | – | – |
| **Admin** | ✓ | ✓ (baca-saja) | – | – |
| **Master** | ✓ | ✓ (baca-saja) | – | ✓ |

Peran disimpan di kolom `User.peran`. Bedanya pada cara mengubahnya:

- **Fismed ↔ Admin** diatur master lewat Profil → Fismed.
- **Master** tidak bisa diberikan atau dicabut dari dalam aplikasi. Sumbernya
  environment variable `MASTER_EMAILS` (dipisah koma), disinkronkan setiap login: email
  yang terdaftar dinaikkan jadi master, yang sudah dikeluarkan dari daftar diturunkan
  jadi admin. Tujuannya supaya pemilik aplikasi tidak bisa diturunkan atau dihapus oleh
  siapa pun lewat antarmuka.

`ADMIN_EMAILS` masih dibaca sebagai nama lama bila `MASTER_EMAILS` belum diset, supaya
deployment yang belum diperbarui tidak kehilangan akses masternya.

Master juga tidak bisa mengubah peran atau menghapus akunnya sendiri.

### Hapus akun

Tersedia di **Profil → Fismed**, tombol tempat sampah merah di samping tombol atur peran,
khusus master. Sekali klik membuka satu dialog konfirmasi yang merinci berapa laporan dan
data master yang ikut terhapus.

Laporan milik akun tersebut ikut terhapus. Data master (instansi, alat radiologi, alat
ukur) juga terhapus **kecuali** yang masih dipakai laporan Fismed lain — yang seperti itu
dialihkan kepemilikannya ke master yang menghapus, supaya laporan Fismed lain tidak ikut
rusak.

### Penegakan aturan

Tiga lapis, dan ketiganya wajib:

1. **Daftar** — `filterMilik()` / `filterLaporan()` di `src/lib/akses.ts` selalu menyaring
   ke milik sendiri.
2. **Akses satuan** — `bolehLihat()` memberi admin izin *membuka* satu data milik Fismed
   lain; `bolehUbah()` hanya mengizinkan pemiliknya. Data yang bukan haknya menghasilkan
   404, bukan 403, supaya keberadaannya tidak bocor lewat perbedaan pesan.
3. **Server action** — tiap simpan/hapus memverifikasi ulang kepemilikan dengan
   `bolehUbah()`. Lapis ini yang sebenarnya mengamankan, karena server action bisa
   dipanggil lewat request langsung tanpa melalui tombol di layar. Menyembunyikan form
   sunting saja tidak cukup.

Dua hal yang mudah terlewat dan sudah ditangani:

- Kepemilikan laporan **tidak berpindah** saat disunting — nama Fismed pembuatnya tetap
  yang tercetak di kolom tanda tangan.
- Pilihan alat ukur pada form laporan mengikuti registry **pemilik laporan**, bukan
  pengguna yang membuka, supaya alat ukur yang sudah tercatat tidak hilang saat laporan
  disimpan.

Ini mengubah keputusan PRD bagian 4 yang semula menetapkan data master bersifat bersama
lintas Fismed.

### Masuk dengan Google

Opsional dan mati secara bawaan. Isi `AUTH_GOOGLE_ID` dan `AUTH_GOOGLE_SECRET` untuk
menyalakannya; kalau dikosongkan, providernya tidak didaftarkan dan tombolnya tidak
ditampilkan — aplikasi tetap jalan penuh dengan email + kata sandi.

Cara mendapatkan kredensialnya: Google Cloud Console → APIs & Services → Credentials →
Create Credentials → OAuth client ID → Web application. Daftarkan redirect URI berikut:

```
http://localhost:3000/api/auth/callback/google      (lokal)
https://<domain-anda>/api/auth/callback/google      (produksi)
```

Tiga hal yang perlu diketahui soal perilakunya:

- **Akun disatukan berdasarkan email.** Fismed yang sudah punya akun email+sandi lalu
  masuk lewat Google dengan alamat yang sama akan masuk ke akun yang sudah ada itu —
  bukan membuat akun kedua yang laporannya terpisah. Nama, gelar, dan NIP yang sudah
  disunting tidak tertimpa data profil Google.
- **Hanya email yang sudah diverifikasi Google yang diterima** (`profile.email_verified`).
  Ini yang membuat penyatuan lewat email di atas aman: tanpa itu, siapa pun yang
  mendaftarkan alamat email Fismed lain di Google bisa mengambil alih akunnya.
- **Akun buatan Google tidak punya kata sandi** (`User.passwordHash` boleh null), dan
  jalur email+sandi menolak akun seperti itu. Gelar dan NIP-nya kosong sampai diisi
  sendiri di halaman Profil — keduanya ikut tercetak di kolom tanda tangan laporan.

## Tanda tangan Fismed

Fismed memasang gambar tanda tangannya sekali di **Profil**, lalu gambar itu tercetak
otomatis pada kolom tanda tangan laporan. Dua cara mengisinya: mengunggah foto/hasil pindai
tanda tangan di kertas (PNG/JPG), atau menggambarnya langsung di kotak kanvas dengan mouse
maupun jari. Keduanya dikecilkan di browser ke lebar maksimum 600 px dan disimpan sebagai
data URL PNG di kolom `User.tandaTanganGambar`.

**Ini tanda tangan elektronik tidak tersertifikasi, dan memang itu yang dipakai.** Tanda
tangan elektronik *tersertifikasi* (BSrE, Privy, VIDA, Peruri) menanam sertifikat
kriptografis ke dalam berkas PDF-nya — mustahil lewat dialog cetak browser, dan
menambahkannya berarti membongkar keputusan "tanpa Puppeteer/Chromium" yang jadi dasar
ekspor PDF di aplikasi ini. Dokumen yang dihasilkan juga sudah berstatus laporan kerja
internal, bukan sertifikat resmi berlegalitas. Gambar tanda tangan tetap sah disebut tanda
tangan elektronik menurut UU ITE — hanya kategorinya tidak tersertifikasi, dan kotak "Status
dokumen" di halaman pertama laporan menyatakannya apa adanya.

### Simpan permanen — laporan ditandatangani lalu dikunci

Laporan baru selalu berstatus **Draf** dan bebas disunting. Ada dua tombol di bawah form:

- **Simpan Draf** — menyimpan tanpa mengubah status, dipakai berkali-kali selama pengisian.
- **Simpan Permanen** — membuka dialog konfirmasi, lalu menandatangani sekaligus **mengunci**
  laporan.

Menyimpan permanen itulah tindakan menandatangani: tanda tangan disalin dari Profil ke
`Laporan.tandaTanganSnapshot`, sejajar maksudnya dengan `konfigurasiSnapshot`.

**Setelah permanen, laporan tidak dapat diubah lagi oleh siapa pun** — termasuk pemiliknya
sendiri dan master. Halamannya berganti jadi tampilan baca-saja, dan `simpanLaporan`
menolak setiap penyuntingan. Inilah inti fiturnya: hasil pengukuran yang sudah
ditandatangani tidak boleh bisa dirapikan setelah laporan terbit, jadi tanda tangannya
benar-benar menjamin sesuatu.

Konsekuensi yang perlu diketahui sebelum menekannya:

- Angka hasil uji, kesimpulan, catatan, dan rekomendasi ikut terkunci.
- Laporan terkunci **tidak bisa dihapus pemiliknya** — hanya master. Kalau pemilik masih
  bisa menghapus lalu membuat ulang, penguncian cuma formalitas.
- Mengganti tanda tangan di Profil tidak mengubah laporan yang sudah permanen.
- Tidak ada jalan kembali ke Draf. Periksa seluruh isian dulu.

**Tanda tangan wajib dipasang sebelum menyimpan permanen.** Kalau belum ada, aksinya ditolak
dengan pesan yang mengarahkan ke halaman Profil — bukan sekadar cerewet, karena laporan yang
terlanjur terkunci tanpa tanda tangan tidak akan pernah bisa ditandatangani.

Selama masih Draf, laporan tetap bisa dicetak dan ditandatangani basah seperti biasa; yang
tercetak adalah ruang kosong. Kalau kolom tanda tangan kosong padahal seharusnya terisi,
halaman pratinjau cetak menjelaskan sebabnya lewat catatan kuning yang hanya tampil di layar
— tidak ikut tercetak.

### Panduan singkat

Dashboard menampilkan dialog panduan **sekali di awal tiap sesi masuk**: penjelasan singkat
fungsi aplikasi dan urutan kerjanya dari instansi sampai simpan permanen. Sengaja bukan
hanya untuk pengguna baru — langkah terakhirnya tidak bisa dibatalkan, jadi pengingatnya
tetap berguna.

Yang berubah setelah tanda tangan terpasang hanyalah blok "pasang tanda tangan dulu" yang
ikut hilang; sisa panduannya tetap ditampilkan.

Ada dua cara menutupnya:

- **Mengerti** — menutup untuk sesi ini saja; panduannya muncul lagi saat masuk berikutnya.
- **Jangan tampilkan lagi** — mematikannya seterusnya untuk Fismed tersebut.

Penandanya disimpan di `sessionStorage` dan `localStorage`, dibedakan per pengguna, jadi
tidak perlu kolom apa pun di database dan berganti akun di tab yang sama tidak ikut membawa
keputusan akun sebelumnya. Mematikan panduan tidak berisiko: kalau tanda tangannya memang
belum ada, `simpanLaporan` tetap menolak simpan permanen dengan pesan yang mengarahkan ke
halaman Profil.

Admin dan master yang membuka laporan Fismed lain ikut mendapat tanda tangan pemiliknya saat
mencetak — dokumen itu memang hasil kerja Fismed tersebut, dan aksesnya tetap baca-saja.

### Menambah provider lain (OTP, dsb.)

`src/auth.ts` memakai Auth.js v5. Menambah provider cukup dengan menambah entri di array
`providers` — tidak ada bagian lain aplikasi yang perlu berubah, karena semua halaman
membaca sesi lewat `requireUser()` di `src/lib/session.ts`.

## Yang sengaja di luar cakupan

Sesuai PRD 5.3: penerbitan sertifikat resmi & tanda tangan elektronik bersertifikat,
penomoran laporan otomatis, perhitungan interval kalibrasi ulang, approval berjenjang
multi-role, portal klien, integrasi langsung dengan alat ukur, dan aplikasi mobile native.

Peringatan alat ukur kadaluarsa juga di luar cakupan — tanggal masa kalibrasi tetap
disimpan dan ditandai secara visual di dashboard dan saat memilih alat ukur, tetapi
sistem tidak memblokir pemakaiannya.
