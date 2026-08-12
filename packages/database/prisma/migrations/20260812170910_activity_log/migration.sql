-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('ORDER_CREATED', 'STATUS_CHANGED', 'TECHNICIAN_ASSIGNED', 'PRIORITY_CHANGED', 'DIAGNOSIS_UPDATED', 'OBSERVATIONS_UPDATED', 'DESCRIPTION_UPDATED', 'EQUIPMENT_LINKED', 'EQUIPMENT_UNLINKED', 'PART_ADDED', 'PART_REMOVED', 'PHOTO_ADDED', 'PHOTO_REMOVED', 'BILLING_UPDATED', 'BILLED_AT_CHANGED', 'COLLECTION_DOC_GENERATED', 'PAYMENT_REGISTERED', 'PAYMENT_DELETED');

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "isFinancial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_companyId_idx" ON "ActivityLog"("companyId");

-- CreateIndex
CREATE INDEX "ActivityLog_workOrderId_createdAt_idx" ON "ActivityLog"("workOrderId", "createdAt");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
