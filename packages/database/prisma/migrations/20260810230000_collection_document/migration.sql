-- Documento de cobro (cuenta de cobro) generado a partir de una orden
-- cerrada. Todo opcional salvo el contador y el título (con default), para
-- no requerir backfill de las empresas/órdenes ya existentes.

-- AlterTable
-- Configuración del documento a nivel de tenant.
ALTER TABLE "Company" ADD COLUMN     "collectionDocTitle" TEXT NOT NULL DEFAULT 'Cuenta de cobro',
ADD COLUMN     "payeeName" TEXT,
ADD COLUMN     "payeeDocument" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "signerName" TEXT,
ADD COLUMN     "signerRole" TEXT,
ADD COLUMN     "collectionDocFootnote" TEXT,
ADD COLUMN     "nextCollectionNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
-- collectionNumber/collectionIssuedAt nacen NULL: solo se asignan cuando
-- un ADMIN genera el documento sobre una orden ya cerrada (POST
-- /work-orders/:id/collection-document). Postgres permite múltiples NULL
-- en un índice único, así que el @@unique de abajo no afecta a las
-- órdenes que todavía no tienen cuenta de cobro.
ALTER TABLE "WorkOrder" ADD COLUMN     "collectionNumber" INTEGER,
ADD COLUMN     "collectionIssuedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_companyId_collectionNumber_key" ON "WorkOrder"("companyId", "collectionNumber");
