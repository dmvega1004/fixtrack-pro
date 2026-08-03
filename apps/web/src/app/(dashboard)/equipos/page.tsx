import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getEquipments } from "@/lib/api/equipments";
import { getWorkOrders } from "@/lib/api/work-orders";
import {
  EquipmentCatalog,
  type EquipmentListItem,
} from "@/components/equipment/equipment-catalog";

export default async function EquiposPage() {
  const [equipments, workOrders] = await Promise.all([
    getEquipments(),
    getWorkOrders(),
  ]);

  // Conteo de órdenes por equipo sobre las órdenes visibles para el usuario
  // actual (el backend ya restringe qué órdenes ve cada rol).
  const orderCounts = new Map<string, number>();
  for (const order of workOrders) {
    orderCounts.set(
      order.equipmentId,
      (orderCounts.get(order.equipmentId) ?? 0) + 1,
    );
  }

  const equipmentsWithCounts: EquipmentListItem[] = equipments.map(
    (equipment) => ({
      ...equipment,
      orderCount: orderCounts.get(equipment.id) ?? 0,
    }),
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Equipos</h1>
          <p className="text-sm text-muted-foreground">
            {equipments.length}{" "}
            {equipments.length === 1 ? "equipo registrado" : "equipos registrados"}
          </p>
        </div>
        <Link
          href="/equipos/nuevo"
          className={buttonVariants({ variant: "default" })}
        >
          Nuevo equipo
        </Link>
      </div>

      {equipments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Aún no hay equipos registrados.{" "}
          <Link href="/equipos/nuevo" className="text-primary underline">
            Registra el primero
          </Link>
          .
        </p>
      ) : (
        <EquipmentCatalog equipments={equipmentsWithCounts} />
      )}
    </div>
  );
}
