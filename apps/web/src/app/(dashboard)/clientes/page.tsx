import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getClients } from "@/lib/api/clients";
import { ClientCatalog, type ClientListItem } from "@/components/client/client-catalog";

export default async function ClientesPage() {
  // GET /clients ya trae equipmentCount/orderCount agregados en SQL (ver
  // ClientsService.findAll) — antes esta pantalla traía TODOS los equipos
  // y TODAS las órdenes de la empresa solo para contarlos acá en JS.
  const clients = await getClients();

  const clientsWithCounts: ClientListItem[] = clients.map((client) => ({
    ...client,
    equipmentCount: client.equipmentCount ?? 0,
    orderCount: client.orderCount ?? 0,
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
