import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getClients } from "@/lib/api/clients";
import { getEquipments } from "@/lib/api/equipments";
import { getWorkOrders } from "@/lib/api/work-orders";
import { ClientCatalog, type ClientListItem } from "@/components/client/client-catalog";

export default async function ClientesPage() {
  const [clients, equipments, workOrders] = await Promise.all([
    getClients(),
    getEquipments(),
    getWorkOrders(),
  ]);

  // Conteos calculados sobre lo que el backend ya devolvió filtrado por rol
  // (Admin/Coordinador ven todo, Técnico solo lo suyo) — no hay nada de RBAC
  // que replicar acá, igual que en /equipos.
  const equipmentCounts = new Map<string, number>();
  for (const equipment of equipments) {
    equipmentCounts.set(
      equipment.clientId,
      (equipmentCounts.get(equipment.clientId) ?? 0) + 1,
    );
  }

  const orderCounts = new Map<string, number>();
  for (const order of workOrders) {
    orderCounts.set(order.clientId, (orderCounts.get(order.clientId) ?? 0) + 1);
  }

  const clientsWithCounts: ClientListItem[] = clients.map((client) => ({
    ...client,
    equipmentCount: equipmentCounts.get(client.id) ?? 0,
    orderCount: orderCounts.get(client.id) ?? 0,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length}{" "}
            {clients.length === 1 ? "cliente registrado" : "clientes registrados"}
          </p>
        </div>
        <Link
          href="/clientes/nuevo"
          className={buttonVariants({ variant: "default" })}
        >
          Nuevo cliente
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Aún no hay clientes registrados.{" "}
          <Link href="/clientes/nuevo" className="text-primary underline">
            Registra el primero
          </Link>
          .
        </p>
      ) : (
        <ClientCatalog clients={clientsWithCounts} />
      )}
    </div>
  );
}
