-- AlterTable: agregar la lista de secciones configurables
ALTER TABLE "Company" ADD COLUMN     "letterheadWorkOrderSections" JSONB NOT NULL DEFAULT '[]';

-- Backfill: toda empresa que haya personalizado alguno de los 4 rótulos
-- retirados recibe la lista equivalente de 4 secciones, con los defaults
-- de hoy rellenando lo que no tocó. Empresas que nunca tocaron ninguno de
-- los 4 quedan con el default '[]' (sin configurar, igual que hoy).
UPDATE "Company"
SET "letterheadWorkOrderSections" = jsonb_build_array(
  jsonb_build_object('label', COALESCE("letterheadDescriptionLabel", 'Descripción'), 'source', 'DESCRIPTION'),
  jsonb_build_object('label', COALESCE("letterheadDiagnosisLabel", 'Hallazgo técnico / Diagnóstico'), 'source', 'DIAGNOSIS'),
  jsonb_build_object('label', COALESCE("letterheadObservationsLabel", 'Observaciones y recomendaciones'), 'source', 'OBSERVATIONS'),
  jsonb_build_object('label', COALESCE("letterheadSuggestionsLabel", 'Sugerencias y recomendaciones'), 'source', 'SUGGESTIONS')
)
WHERE "letterheadDescriptionLabel" IS NOT NULL
   OR "letterheadDiagnosisLabel" IS NOT NULL
   OR "letterheadObservationsLabel" IS NOT NULL
   OR "letterheadSuggestionsLabel" IS NOT NULL;

-- AlterTable: retirar los 4 campos de rótulo — consolidados en
-- letterheadWorkOrderSections, ya no deben quedar dos formas de renombrar
-- lo mismo.
ALTER TABLE "Company" DROP COLUMN "letterheadDescriptionLabel",
DROP COLUMN "letterheadDiagnosisLabel",
DROP COLUMN "letterheadObservationsLabel",
DROP COLUMN "letterheadSuggestionsLabel";
