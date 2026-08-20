-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "directCostAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "directCostDescription" TEXT;
