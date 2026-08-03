import { notFound } from "next/navigation";
import { getEquipment } from "@/lib/api/equipments";
import { getClients } from "@/lib/api/clients";
import { HttpError } from "@/lib/api/http";
import { EquipmentForm } from "@/components/equipment/equipment-form";

interface EditarEquipoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarEquipoPage({
  params,
}: EditarEquipoPageProps) {
  const { id } = await params;

  let equipment;
  try {
    equipment = await getEquipment(id);
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const clients = await getClients();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar equipo</h1>
        <p className="text-sm text-muted-foreground">
          {equipment.brand} {equipment.model}
        </p>
      </div>
      <EquipmentForm
        mode="edit"
        equipmentId={equipment.id}
        clients={clients}
        initial={equipment}
      />
    </div>
  );
}
