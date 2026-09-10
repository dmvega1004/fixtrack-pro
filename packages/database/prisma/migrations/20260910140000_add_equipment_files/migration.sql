-- CreateTable
CREATE TABLE "EquipmentFile" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentFile_storagePath_key" ON "EquipmentFile"("storagePath");

-- CreateIndex
CREATE INDEX "EquipmentFile_companyId_idx" ON "EquipmentFile"("companyId");

-- CreateIndex
CREATE INDEX "EquipmentFile_equipmentId_idx" ON "EquipmentFile"("equipmentId");

-- AddForeignKey
ALTER TABLE "EquipmentFile" ADD CONSTRAINT "EquipmentFile_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentFile" ADD CONSTRAINT "EquipmentFile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentFile" ADD CONSTRAINT "EquipmentFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
