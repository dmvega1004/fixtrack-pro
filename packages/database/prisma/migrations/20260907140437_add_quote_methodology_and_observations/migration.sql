-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "defaultMethodology" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "methodology" TEXT,
ADD COLUMN     "observations" TEXT;
