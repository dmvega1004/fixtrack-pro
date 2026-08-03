import { getSession } from "@/lib/session";
import { getClients } from "@/lib/api/clients";
import { getEquipments } from "@/lib/api/equipments";
import { getTechnicians } from "@/lib/api/users";
import { NewOrderForm } from "@/components/work-orders/new-order-form";

interface NuevaOrdenPageProps {
  searchParams: Promise<{ equipo?: string }>;
}

export default async function NuevaOrdenPage({
  searchParams,
}: NuevaOrdenPageProps) {
  const { equipo } = await searchParams;
  const session = await getSession();
  const canAssign =
    session?.role === "ADMIN" || session?.role === "COORDINATOR";

  const [clients, equipments, technicians] = await Promise.all([
    getClients(),
    getEquipments(),
    canAssign ? getTechnicians() : Promise.resolve([]),
  ]);

  // Preselección desde la ficha de un equipo (?equipo=id): si el equipo
  // existe y es visible para el tenant, se preselecciona junto a su cliente.
  const preselectedEquipment = equipo
    ? equipments.find((equipment) => equipment.id === equipo)
    : undefined;

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
        initialClientId={preselectedEquipment?.client.id}
        initialEquipmentId={preselectedEquipment?.id}
      />
    </div>
  );
}
