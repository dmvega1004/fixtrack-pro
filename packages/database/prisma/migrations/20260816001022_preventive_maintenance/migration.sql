-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('CORRECTIVE', 'PREVENTIVE', 'INSPECTION', 'INSTALLATION');

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'MAINTENANCE_UPDATED';

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "lastMaintenanceAt" DATE,
ADD COLUMN     "maintenanceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maintenanceIntervalMonths" INTEGER,
ADD COLUMN     "nextMaintenanceAt" DATE;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "serviceType" "ServiceType" NOT NULL DEFAULT 'CORRECTIVE';

-- CreateIndex
CREATE INDEX "Equipment_companyId_nextMaintenanceAt_idx" ON "Equipment"("companyId", "nextMaintenanceAt");
