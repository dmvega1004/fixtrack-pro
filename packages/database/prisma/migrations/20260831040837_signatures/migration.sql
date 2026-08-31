-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'SIGNATURES_CAPTURED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "signatureImageUrl" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "receiverDocument" TEXT,
ADD COLUMN     "receiverName" TEXT,
ADD COLUMN     "receiverSignatureUrl" TEXT,
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "technicianDocument" TEXT,
ADD COLUMN     "technicianName" TEXT,
ADD COLUMN     "technicianSignatureUrl" TEXT;
