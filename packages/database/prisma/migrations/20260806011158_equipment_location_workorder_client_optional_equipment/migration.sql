-- AlterTable
-- Ubicación física del equipo en la sede del cliente. Nace nullable: no
-- hay un valor razonable para retroactivar en los equipos ya registrados.
ALTER TABLE "Equipment" ADD COLUMN     "location" TEXT;

-- DropForeignKey
-- Se recrea más abajo con ON DELETE SET NULL, porque equipmentId deja de
-- ser obligatorio (servicios locativos sin equipo asociado).
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_equipmentId_fkey";

-- AlterTable
-- clientId nace nullable a propósito: ya hay filas en WorkOrder y no hay
-- un valor por defecto razonable hasta hacer el backfill de abajo.
ALTER TABLE "WorkOrder" ADD COLUMN     "clientId" TEXT;

-- Backfill: toda orden existente tiene equipmentId (era obligatorio antes
-- de esta migración), así que el cliente de cada orden es el cliente de
-- su equipo asociado.
UPDATE "WorkOrder" AS "wo"
SET "clientId" = "eq"."clientId"
FROM "Equipment" AS "eq"
WHERE "wo"."equipmentId" = "eq"."id";

-- Ya no quedan NULLs (toda fila fue poblada arriba): aplicar NOT NULL.
-- clientId pasa a ser el vínculo principal y obligatorio de la orden.
ALTER TABLE "WorkOrder" ALTER COLUMN "clientId" SET NOT NULL;

-- equipmentId pasa a ser opcional: la empresa presta servicios locativos
-- (sellado, limpieza, instalación) sin equipo asociado.
ALTER TABLE "WorkOrder" ALTER COLUMN "equipmentId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "WorkOrder_clientId_idx" ON "WorkOrder"("clientId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
