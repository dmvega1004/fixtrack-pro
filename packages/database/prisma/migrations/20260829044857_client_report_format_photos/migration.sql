-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "reportFormatIncludePhotos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reportFormatPhotosLabel" TEXT;
