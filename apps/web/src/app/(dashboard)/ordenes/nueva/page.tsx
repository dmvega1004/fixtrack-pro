import { getSession } from "@/lib/session";
import { getClients } from "@/lib/api/clients";
import { getEquipments } from "@/lib/api/equipments";
import { getTechnicians } from "@/lib/api/users";
import { NewOrderForm } from "@/components/work-orders/new-order-form";

export default async function NuevaOrdenPage() {
  const session = await getSession();
  const canAssign =
    session?.role === "ADMIN" || session?.role === "COORDINATOR";

  const [clients, equipments, technicians] = await Promise.all([
    getClients(),
    getEquipments(),
    canAssign ? getTechnicians() : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva orden</h1>
        <p className="text-sm text-muted-foreground">
          Registra una orden de trabajo en campo.
        </p>
      </div>
      <NewOrderForm
        clients={clients}
        equipments={equipments}
        technicians={technicians}
        canAssign={canAssign}
      />
    </div>
  );
}
