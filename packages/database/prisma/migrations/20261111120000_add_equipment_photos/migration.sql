-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "coverPhotoId" TEXT;

-- CreateTable
CREATE TABLE "EquipmentPhoto" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentPhoto_publicId_key" ON "EquipmentPhoto"("publicId");

-- CreateIndex
CREATE INDEX "EquipmentPhoto_companyId_idx" ON "EquipmentPhoto"("companyId");

-- CreateIndex
CREATE INDEX "EquipmentPhoto_equipmentId_createdAt_idx" ON "EquipmentPhoto"("equipmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_coverPhotoId_key" ON "Equipment"("coverPhotoId");

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "EquipmentPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPhoto" ADD CONSTRAINT "EquipmentPhoto_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPhoto" ADD CONSTRAINT "EquipmentPhoto_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPhoto" ADD CONSTRAINT "EquipmentPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

