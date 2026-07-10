/*
  Warnings:

  - You are about to drop the column `price` on the `SparePart` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyId,sku]` on the table `SparePart` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cost` to the `SparePart` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salePrice` to the `SparePart` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku` to the `SparePart` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SparePart" DROP COLUMN "price",
ADD COLUMN     "cost" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "minStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "salePrice" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "sku" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "WorkOrderPart" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderPart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkOrderPart_companyId_idx" ON "WorkOrderPart"("companyId");

-- CreateIndex
CREATE INDEX "WorkOrderPart_workOrderId_idx" ON "WorkOrderPart"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderPart_sparePartId_idx" ON "WorkOrderPart"("sparePartId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderPart_workOrderId_sparePartId_key" ON "WorkOrderPart"("workOrderId", "sparePartId");

-- CreateIndex
CREATE UNIQUE INDEX "SparePart_companyId_sku_key" ON "SparePart"("companyId", "sku");

-- AddForeignKey
ALTER TABLE "WorkOrderPart" ADD CONSTRAINT "WorkOrderPart_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPart" ADD CONSTRAINT "WorkOrderPart_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPart" ADD CONSTRAINT "WorkOrderPart_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
