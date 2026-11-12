-- AlterTable
ALTER TABLE "EquipmentPhoto" ADD COLUMN     "sourceAttachmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentPhoto_equipmentId_sourceAttachmentId_key" ON "EquipmentPhoto"("equipmentId", "sourceAttachmentId");

