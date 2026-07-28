-- Contador atómico por tenant para el consecutivo de órdenes.
-- Default 1 cubre empresas nuevas (y las existentes sin órdenes) sin backfill.
ALTER TABLE "Company" ADD COLUMN     "nextOrderNumber" INTEGER NOT NULL DEFAULT 1;

-- orderNumber nace nullable: ya hay filas en WorkOrder y no hay un valor
-- por defecto razonable hasta que las numeremos.
ALTER TABLE "WorkOrder" ADD COLUMN     "orderNumber" INTEGER;

-- Backfill seguro: numera las órdenes existentes por empresa, en el orden
-- en que fueron creadas, para que el consecutivo respete el historial real.
WITH "numbered" AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "companyId" ORDER BY "createdAt" ASC) AS "rn"
  FROM "WorkOrder"
)
UPDATE "WorkOrder" AS "wo"
SET "orderNumber" = "numbered"."rn"
FROM "numbered"
WHERE "wo"."id" = "numbered"."id";

-- Ya no quedan NULLs (toda fila fue numerada arriba): aplicar NOT NULL.
ALTER TABLE "WorkOrder" ALTER COLUMN "orderNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_companyId_orderNumber_key" ON "WorkOrder"("companyId", "orderNumber");

-- Backfill del contador de cada empresa: el siguiente número libre es el
-- máximo orderNumber ya asignado + 1 (0 + 1 para empresas sin órdenes,
-- aunque esas ya quedaron en 1 por el DEFAULT de la columna).
UPDATE "Company" AS "c"
SET "nextOrderNumber" = COALESCE(
  (SELECT MAX("wo"."orderNumber") FROM "WorkOrder" AS "wo" WHERE "wo"."companyId" = "c"."id"),
  0
) + 1;
