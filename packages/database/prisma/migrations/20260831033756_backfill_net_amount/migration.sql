-- Backfill: las órdenes cerradas ANTES de que existiera el módulo de
-- retenciones tienen totalAmount congelado pero netAmount en null (la
-- migración anterior fue puramente aditiva, sin backfill). Sin esto,
-- desaparecerían de la cartera (Cobros filtra netAmount IS NOT NULL) y de
-- Rentabilidad. Para una orden sin retenciones, netAmount = totalAmount
-- — exactamente el comportamiento esperado ("una orden sin retenciones
-- se comporta igual que hoy").
UPDATE "WorkOrder"
SET "netAmount" = "totalAmount"
WHERE "totalAmount" IS NOT NULL AND "netAmount" IS NULL;
