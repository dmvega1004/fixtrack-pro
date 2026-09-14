-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "letterheadDescriptionLabel" TEXT,
ADD COLUMN     "letterheadDiagnosisLabel" TEXT,
ADD COLUMN     "letterheadObservationsLabel" TEXT,
ADD COLUMN     "letterheadSectionTitleStyle" TEXT NOT NULL DEFAULT 'UNDERLINE',
ADD COLUMN     "letterheadSuggestionsLabel" TEXT,
ADD COLUMN     "letterheadWorkOrderHeaderFields" TEXT[] DEFAULT ARRAY[]::TEXT[];
