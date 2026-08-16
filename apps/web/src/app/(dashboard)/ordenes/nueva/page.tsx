import { getSession } from "@/lib/session";
import { getClients } from "@/lib/api/clients";
import { getEquipments } from "@/lib/api/equipments";
import { getTechnicians } from "@/lib/api/users";
import type { ServiceType } from "@/components/shared/service-type-badge";
import { NewOrderForm } from "@/components/work-orders/new-order-form";

const SERVICE_TYPES: ServiceType[] = [
  "CORRECTIVE",
  "PREVENTIVE",
  "INSPECTION",
  "INSTALLATION",
];

function isServiceType(value: string): value is ServiceType {
  return (SERVICE_TYPES as string[]).includes(value);
}

interface NuevaOrdenPageProps {
  searchParams: Promise<{
    equipo?: string;
    /** "Programar mantenimiento" (?equipos=id1,id2,...): varios equipos del mismo cliente. */
    equipos?: string;
    cliente?: string;
    tipo?: string;
    descripcion?: string;
  }>;
}

export default async function NuevaOrdenPage({
  searchParams,
}: NuevaOrdenPageProps) {
  const { equipo, equipos, cliente, tipo, descripcion } = await searchParams;
  const session = await getSession();
  const canAssign =
    session?.role === "ADMIN" || session?.role === "COORDINATOR";

  const [clients, equipments, technicians] = await Promise.all([
    getClients(),
    getEquipments(),
    canAssign ? getTechnicians() : Promise.resolve([]),
  ]);

  // Preselección de equipos: desde la ficha de un equipo (?equipo=id, uno
  // solo) o desde "Programar mantenimiento" (?equipos=id1,id2,..., varios
  // del mismo cliente — ver /mantenimiento). Solo se conservan los ids que
  // de verdad existen y son visibles para el tenant.
  const requestedIds = [
    ...(equipo ? [equipo] : []),
    ...(equipos ? equipos.split(",").filter(Boolean) : []),
  ];
  const preselectedEquipments = equipments.filter((equipment) =>
    requestedIds.includes(equipment.id),
  );

  // ?cliente= (desde /mantenimiento, cuando el cliente no tiene equipos
  // preseleccionables — no debería pasar, pero no depende de que sí haya
  // equipos) tiene prioridad; si no viene, se deriva del primer equipo
  // preseleccionado (caso ?equipo= desde la ficha de un equipo).
  const initialClientId = cliente ?? preselectedEquipments[0]?.client.id;
  const initialServiceType = tipo && isServiceType(tipo) ? tipo : undefined;

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
        initialClientId={initialClientId}
        initialEquipmentIds={preselectedEquipments.map((equipment) => equipment.id)}
        initialServiceType={initialServiceType}
        initialDescription={descripcion}
      />
    </div>
  );
}
