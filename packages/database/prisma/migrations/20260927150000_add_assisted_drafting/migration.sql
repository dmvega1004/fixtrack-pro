-- CreateEnum
CREATE TYPE "AssistedDraftStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'ASSISTED_TEXT_SAVED';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "assistedDraftMonthlyLimit" INTEGER;

-- CreateTable
CREATE TABLE "AssistedDraftUsage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "userId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AssistedDraftStatus" NOT NULL DEFAULT 'PENDING',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "errorCode" TEXT,
    "templatesHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistedDraftUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistedDraftUsage_companyId_createdAt_idx" ON "AssistedDraftUsage"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AssistedDraftUsage_workOrderId_idx" ON "AssistedDraftUsage"("workOrderId");

-- AddForeignKey
ALTER TABLE "AssistedDraftUsage" ADD CONSTRAINT "AssistedDraftUsage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistedDraftUsage" ADD CONSTRAINT "AssistedDraftUsage_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistedDraftUsage" ADD CONSTRAINT "AssistedDraftUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

