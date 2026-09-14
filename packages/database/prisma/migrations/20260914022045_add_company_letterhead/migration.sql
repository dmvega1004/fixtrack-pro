-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "letterheadAccentColor" TEXT,
ADD COLUMN     "letterheadCollectionDocCode" TEXT,
ADD COLUMN     "letterheadCollectionDocDate" TEXT,
ADD COLUMN     "letterheadCollectionDocVersion" TEXT,
ADD COLUMN     "letterheadFooterText" TEXT,
ADD COLUMN     "letterheadQuoteDocCode" TEXT,
ADD COLUMN     "letterheadQuoteDocDate" TEXT,
ADD COLUMN     "letterheadQuoteDocVersion" TEXT,
ADD COLUMN     "letterheadShowFixtrackBranding" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "letterheadWorkOrderDocCode" TEXT,
ADD COLUMN     "letterheadWorkOrderDocDate" TEXT,
ADD COLUMN     "letterheadWorkOrderDocVersion" TEXT;
