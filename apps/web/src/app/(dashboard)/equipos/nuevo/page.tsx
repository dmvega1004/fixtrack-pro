import { getClients } from "@/lib/api/clients";
import { EquipmentForm } from "@/components/equipment/equipment-form";

interface NuevoEquipoPageProps {
  searchParams: Promise<{ cliente?: string }>;
}

export default async function NuevoEquipoPage({ searchParams }: NuevoEquipoPageProps) {
  const { cliente } = await searchParams;
  const clients = await getClients();

  // Preselección desde la ficha de un cliente (?cliente=id): solo si existe
  // y es visible para el tenant (ya viene filtrado por getClients()).
  const preselectedClientId = cliente && clients.some((client) => client.id === cliente)
    ? cliente
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo equipo</h1>
        <p className="text-sm text-muted-foreground">
          Registra un equipo y su código QR para dar seguimiento a sus órdenes.
        </p>
      </div>
      <EquipmentForm mode="create" clients={clients} initialClientId={preselectedClientId} />
    </div>
  );
}
