-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "netAmount" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "Retention" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(6,3) NOT NULL,
    "base" TEXT NOT NULL,
    "baseRetentionId" TEXT,
    "position" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientRetention" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "retentionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientRetention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderRetention" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "retentionId" TEXT,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(6,3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "WorkOrderRetention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Retention_companyId_idx" ON "Retention"("companyId");

-- CreateIndex
CREATE INDEX "Retention_companyId_position_idx" ON "Retention"("companyId", "position");

-- CreateIndex
CREATE INDEX "ClientRetention_companyId_idx" ON "ClientRetention"("companyId");

-- CreateIndex
CREATE INDEX "ClientRetention_clientId_idx" ON "ClientRetention"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientRetention_clientId_retentionId_key" ON "ClientRetention"("clientId", "retentionId");

-- CreateIndex
CREATE INDEX "WorkOrderRetention_companyId_idx" ON "WorkOrderRetention"("companyId");

-- CreateIndex
CREATE INDEX "WorkOrderRetention_workOrderId_idx" ON "WorkOrderRetention"("workOrderId");

-- AddForeignKey
ALTER TABLE "Retention" ADD CONSTRAINT "Retention_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRetention" ADD CONSTRAINT "ClientRetention_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRetention" ADD CONSTRAINT "ClientRetention_retentionId_fkey" FOREIGN KEY ("retentionId") REFERENCES "Retention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRetention" ADD CONSTRAINT "ClientRetention_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderRetention" ADD CONSTRAINT "WorkOrderRetention_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderRetention" ADD CONSTRAINT "WorkOrderRetention_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderRetention" ADD CONSTRAINT "WorkOrderRetention_retentionId_fkey" FOREIGN KEY ("retentionId") REFERENCES "Retention"("id") ON DELETE SET NULL ON UPDATE CASCADE;
