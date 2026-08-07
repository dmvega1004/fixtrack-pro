-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CHECK', 'CARD', 'OTHER');

-- AlterTable
-- Días de crédito acordados con el cliente. Nace con default 30 para no
-- requerir backfill de los clientes ya existentes.
ALTER TABLE "Client" ADD COLUMN     "paymentTermDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
-- Porcentaje de IVA del tenant. Nace en 0 (no responsable de IVA) para no
-- requerir backfill de las empresas ya existentes.
ALTER TABLE "Company" ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
-- laborAmount/additionalAmount/discountAmount nacen en 0: las órdenes ya
-- existentes quedan valorizadas en 0 hasta que un ADMIN las cargue.
-- taxRateApplied/totalAmount/billedAt nacen NULL a propósito: son el
-- congelamiento contable que solo ocurre al pasar la orden a COMPLETED
-- (ver WorkOrdersService), así que no hay valor razonable que backfillear
-- para órdenes ya cerradas antes de esta migración.
ALTER TABLE "WorkOrder" ADD COLUMN     "additionalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "additionalDescription" TEXT,
ADD COLUMN     "billedAt" TIMESTAMP(3),
ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "laborAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "taxRateApplied" DECIMAL(5,2),
ADD COLUMN     "totalAmount" DECIMAL(12,2);

-- CreateTable
-- Abonos contra una orden. El módulo de cartera (siguiente entrega) se
-- apoya en esta tabla; por ahora solo existe el modelo de datos.
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "registeredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_companyId_idx" ON "Payment"("companyId");

-- CreateIndex
CREATE INDEX "Payment_workOrderId_idx" ON "Payment"("workOrderId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
