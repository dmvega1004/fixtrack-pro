-- Índices de rendimiento (auditoría de /clientes, /cobros, /equipos y el
-- dashboard): compuestos con companyId como columna líder porque todo
-- filtro de este multi-tenant siempre lo incluye primero.

-- GET /work-orders?status= y agregados de conteo por estado (dashboard)
CREATE INDEX "WorkOrder_companyId_status_idx" ON "WorkOrder"("companyId", "status");

-- GET /work-orders?priority= (antes se filtraba en el frontend)
CREATE INDEX "WorkOrder_companyId_priority_idx" ON "WorkOrder"("companyId", "priority");

-- "Facturado del mes" / cartera: rango sobre billedAt
CREATE INDEX "WorkOrder_companyId_billedAt_idx" ON "WorkOrder"("companyId", "billedAt");

-- GET /work-orders?paymentStatus= y GET /billing/receivables
CREATE INDEX "WorkOrder_companyId_paymentStatus_idx" ON "WorkOrder"("companyId", "paymentStatus");

-- "Cobrado del mes": rango sobre paidAt
CREATE INDEX "Payment_companyId_paidAt_idx" ON "Payment"("companyId", "paidAt");

-- GET /work-orders?equipmentId= — el @@unique(workOrderId, equipmentId) no
-- sirve para esta búsqueda porque workOrderId es la columna líder.
CREATE INDEX "WorkOrderEquipment_equipmentId_idx" ON "WorkOrderEquipment"("equipmentId");
