-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "defaultDeliveryTime" TEXT,
ADD COLUMN     "defaultExclusions" TEXT,
ADD COLUMN     "defaultPaymentTerms" TEXT,
ADD COLUMN     "defaultValidityDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "defaultWarrantyTerms" TEXT,
ADD COLUMN     "nextQuoteNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "quoteFollowUpDays" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "quoteFootnote" TEXT;

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "quoteNumber" INTEGER,
    "title" TEXT NOT NULL,
    "siteName" TEXT,
    "scope" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxRateApplied" DECIMAL(5,2),
    "subtotalAmount" DECIMAL(12,2),
    "totalAmount" DECIMAL(12,2),
    "paymentTerms" TEXT,
    "deliveryTime" TEXT,
    "warrantyTerms" TEXT,
    "exclusions" TEXT,
    "validityDays" INTEGER NOT NULL,
    "validUntil" DATE,
    "sentAt" TIMESTAMP(3),
    "followUpAt" DATE,
    "decidedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "sourceWorkOrderId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "sparePartId" TEXT,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteEquipment" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quote_companyId_idx" ON "Quote"("companyId");

-- CreateIndex
CREATE INDEX "Quote_companyId_status_idx" ON "Quote"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_companyId_quoteNumber_key" ON "Quote"("companyId", "quoteNumber");

-- CreateIndex
CREATE INDEX "QuoteItem_companyId_idx" ON "QuoteItem"("companyId");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteEquipment_companyId_idx" ON "QuoteEquipment"("companyId");

-- CreateIndex
CREATE INDEX "QuoteEquipment_quoteId_idx" ON "QuoteEquipment"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteEquipment_equipmentId_idx" ON "QuoteEquipment"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteEquipment_quoteId_equipmentId_key" ON "QuoteEquipment"("quoteId", "equipmentId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteEquipment" ADD CONSTRAINT "QuoteEquipment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteEquipment" ADD CONSTRAINT "QuoteEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteEquipment" ADD CONSTRAINT "QuoteEquipment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
