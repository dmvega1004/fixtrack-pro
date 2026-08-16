import Link from "next/link";
import { getMaintenanceDue } from "@/lib/api/equipments";
import { AllMaintenancePlansPanel } from "@/components/equipment/all-maintenance-plans-panel";
import { MaintenanceDueGroups } from "@/components/equipment/maintenance-due-groups";
import { cn } from "@/lib/utils";

type MaintenanceFilter = "por-vencer" | "todos";

const FILTERS: { key: MaintenanceFilter; label: string }[] = [
  { key: "por-vencer", label: "Por vencer" },
  { key: "todos", label: "Todos los planes" },
];

function parseFilter(value?: string): MaintenanceFilter {
  return value === "todos" ? "todos" : "por-vencer";
}

interface MantenimientoPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function MantenimientoPage({ searchParams }: MantenimientoPageProps) {
  const { filter } = await searchParams;
  const activeFilter = parseFilter(filter);

  // Misma consulta parametrizada del backend (ver EquipmentsService.
  // findMaintenanceDue): "por-vencer" trae la ventana de 30 días, "todos"
  // quita el tope superior — nunca dos consultas distintas que puedan
  // desincronizarse.
  const items = await getMaintenanceDue({ all: activeFilter === "todos" });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Mantenimiento</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "resultado" : "resultados"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/mantenimiento?filter=${f.key}`}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
              activeFilter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {activeFilter === "por-vencer" ? (
        <MaintenanceDueGroups items={items} />
      ) : (
        <AllMaintenancePlansPanel items={items} />
      )}
    </div>
  );
}
