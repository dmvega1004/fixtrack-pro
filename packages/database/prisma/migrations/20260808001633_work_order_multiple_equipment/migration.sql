-- CreateTable
-- Tabla intermedia orden↔equipo: reemplaza el FK 1-a-1 WorkOrder.equipmentId
-- (una orden puede abarcar varios equipos del mismo cliente, ej. un
-- proyecto de adecuación normativa sobre 5 portones cotizado como una sola OT).
CREATE TABLE "WorkOrderEquipment" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkOrderEquipment_companyId_idx" ON "WorkOrderEquipment"("companyId");

-- CreateIndex
CREATE INDEX "WorkOrderEquipment_workOrderId_idx" ON "WorkOrderEquipment"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderEquipment_workOrderId_equipmentId_key" ON "WorkOrderEquipment"("workOrderId", "equipmentId");

-- AddForeignKey
ALTER TABLE "WorkOrderEquipment" ADD CONSTRAINT "WorkOrderEquipment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderEquipment" ADD CONSTRAINT "WorkOrderEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderEquipment" ADD CONSTRAINT "WorkOrderEquipment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: una fila por cada orden existente que tenía equipmentId no nulo,
-- copiando también su companyId. Debe correr ANTES de borrar la columna.
INSERT INTO "WorkOrderEquipment" ("id", "workOrderId", "equipmentId", "companyId", "createdAt")
SELECT gen_random_uuid(), "id", "equipmentId", "companyId", CURRENT_TIMESTAMP
FROM "WorkOrder"
WHERE "equipmentId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_equipmentId_fkey";

-- DropIndex
DROP INDEX "WorkOrder_equipmentId_idx";

-- AlterTable
-- Solo después del backfill: la relación 1-a-1 queda reemplazada por completo.
ALTER TABLE "WorkOrder" DROP COLUMN "equipmentId";
