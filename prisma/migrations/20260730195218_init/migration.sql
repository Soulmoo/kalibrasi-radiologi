-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "gelar" TEXT,
    "nip" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instansi" (
    "id" TEXT NOT NULL,
    "namaInstansi" TEXT NOT NULL,
    "namaFasilitas" TEXT,
    "identitasPemilik" TEXT,
    "alamat" TEXT,
    "kota" TEXT,
    "provinsi" TEXT,
    "telepon" TEXT,
    "email" TEXT,
    "nib" TEXT,
    "nomorIzinPesawat" TEXT,
    "namaPPR" TEXT,
    "noSIB" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Instansi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlatRadiologi" (
    "id" TEXT NOT NULL,
    "instansiId" TEXT NOT NULL,
    "jenisAlat" TEXT NOT NULL,
    "namaAlat" TEXT,
    "lokasiUnit" TEXT,
    "merk" TEXT,
    "model" TEXT,
    "noSeri" TEXT,
    "tahunProduksi" TEXT,
    "konfigurasi" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "AlatRadiologi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlatUkur" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "merek" TEXT,
    "modelTipe" TEXT,
    "noSeri" TEXT,
    "tertelusurKe" TEXT,
    "masaKalibrasiSampai" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "AlatUkur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Laporan" (
    "id" TEXT NOT NULL,
    "jenisAlat" TEXT NOT NULL,
    "nomorLaporan" TEXT,
    "nomorOrder" TEXT,
    "instansiId" TEXT NOT NULL,
    "alatRadiologiId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tanggalUji" TIMESTAMP(3) NOT NULL,
    "tanggalTerbit" TIMESTAMP(3),
    "lokasiUji" TEXT,
    "metodeKerja" TEXT,
    "konfigurasiSnapshot" TEXT NOT NULL DEFAULT '{}',
    "hasilUji" TEXT NOT NULL DEFAULT '{}',
    "kesimpulan" TEXT,
    "catatan" TEXT,
    "rekomendasi" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Laporan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaporanAlatUkur" (
    "laporanId" TEXT NOT NULL,
    "alatUkurId" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LaporanAlatUkur_pkey" PRIMARY KEY ("laporanId","alatUkurId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AlatRadiologi_instansiId_idx" ON "AlatRadiologi"("instansiId");

-- CreateIndex
CREATE INDEX "AlatRadiologi_jenisAlat_idx" ON "AlatRadiologi"("jenisAlat");

-- CreateIndex
CREATE INDEX "Laporan_userId_idx" ON "Laporan"("userId");

-- CreateIndex
CREATE INDEX "Laporan_instansiId_idx" ON "Laporan"("instansiId");

-- CreateIndex
CREATE INDEX "Laporan_jenisAlat_idx" ON "Laporan"("jenisAlat");

-- CreateIndex
CREATE INDEX "Laporan_tanggalUji_idx" ON "Laporan"("tanggalUji");

-- AddForeignKey
ALTER TABLE "AlatRadiologi" ADD CONSTRAINT "AlatRadiologi_instansiId_fkey" FOREIGN KEY ("instansiId") REFERENCES "Instansi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laporan" ADD CONSTRAINT "Laporan_instansiId_fkey" FOREIGN KEY ("instansiId") REFERENCES "Instansi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laporan" ADD CONSTRAINT "Laporan_alatRadiologiId_fkey" FOREIGN KEY ("alatRadiologiId") REFERENCES "AlatRadiologi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laporan" ADD CONSTRAINT "Laporan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaporanAlatUkur" ADD CONSTRAINT "LaporanAlatUkur_laporanId_fkey" FOREIGN KEY ("laporanId") REFERENCES "Laporan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaporanAlatUkur" ADD CONSTRAINT "LaporanAlatUkur_alatUkurId_fkey" FOREIGN KEY ("alatUkurId") REFERENCES "AlatUkur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
