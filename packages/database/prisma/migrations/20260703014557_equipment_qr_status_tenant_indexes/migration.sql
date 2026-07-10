/*
  Warnings:

  - A unique constraint covering the columns `[qrCode]` on the table `Equipment` will be added. If there are existing duplicate values, this will fail.
  - The required column `qrCode` was added to the `Equipment` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('ACTIVE', 'IN_REPAIR', 'RETIRED');

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "qrCode" TEXT NOT NULL,
ADD COLUMN     "status" "EquipmentStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_qrCode_key" ON "Equipment"("qrCode");

-- CreateIndex
CREATE INDEX "Equipment_companyId_idx" ON "Equipment"("companyId");

-- CreateIndex
CREATE INDEX "Equipment_clientId_idx" ON "Equipment"("clientId");

-- CreateIndex
CREATE INDEX "SparePart_companyId_idx" ON "SparePart"("companyId");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_idx" ON "WorkOrder"("companyId");

-- CreateIndex
CREATE INDEX "WorkOrder_equipmentId_idx" ON "WorkOrder"("equipmentId");
