-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "signatureImageUrl" TEXT,
ADD COLUMN     "signatureInCollection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "signatureInQuote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signatureInWorkOrder" BOOLEAN NOT NULL DEFAULT false;
