-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "city" TEXT,
ADD COLUMN     "reportFormatAccentColor" TEXT,
ADD COLUMN     "reportFormatCode" TEXT,
ADD COLUMN     "reportFormatDate" TEXT,
ADD COLUMN     "reportFormatEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reportFormatFooter" TEXT,
ADD COLUMN     "reportFormatIssuer" TEXT,
ADD COLUMN     "reportFormatLogoUrl" TEXT,
ADD COLUMN     "reportFormatS1Label" TEXT,
ADD COLUMN     "reportFormatS1Source" TEXT,
ADD COLUMN     "reportFormatS2Label" TEXT,
ADD COLUMN     "reportFormatS2Source" TEXT,
ADD COLUMN     "reportFormatS3Label" TEXT,
ADD COLUMN     "reportFormatS3Source" TEXT,
ADD COLUMN     "reportFormatTitle" TEXT,
ADD COLUMN     "reportFormatVersion" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "endClientName" TEXT;
