-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentType" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "observations" TEXT;

-- CreateIndex
CREATE INDEX "Client_companyId_documentNumber_idx" ON "Client"("companyId", "documentNumber");
