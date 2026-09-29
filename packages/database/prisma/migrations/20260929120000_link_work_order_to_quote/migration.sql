-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "quoteId" TEXT;

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_quoteId_idx" ON "WorkOrder"("companyId", "quoteId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

