-- CreateTable
CREATE TABLE "AuditDosis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instansiId" TEXT NOT NULL,
    "alatRadiologiId" TEXT NOT NULL,
    "modalitas" TEXT NOT NULL,
    "periodeMulai" TIMESTAMP(3) NOT NULL,
    "periodeSelesai" TIMESTAMP(3) NOT NULL,
    "metode" TEXT NOT NULL,
    "laporanSumberId" TEXT,
    "parameter" TEXT NOT NULL DEFAULT '{}',
    "dataPasien" TEXT NOT NULL DEFAULT '[]',
    "catatan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditDosis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditDosis_userId_idx" ON "AuditDosis"("userId");

-- CreateIndex
CREATE INDEX "AuditDosis_instansiId_idx" ON "AuditDosis"("instansiId");

-- CreateIndex
CREATE INDEX "AuditDosis_alatRadiologiId_idx" ON "AuditDosis"("alatRadiologiId");

-- CreateIndex
CREATE INDEX "AuditDosis_periodeMulai_idx" ON "AuditDosis"("periodeMulai");

-- AddForeignKey
ALTER TABLE "AuditDosis" ADD CONSTRAINT "AuditDosis_instansiId_fkey" FOREIGN KEY ("instansiId") REFERENCES "Instansi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditDosis" ADD CONSTRAINT "AuditDosis_alatRadiologiId_fkey" FOREIGN KEY ("alatRadiologiId") REFERENCES "AlatRadiologi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditDosis" ADD CONSTRAINT "AuditDosis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

