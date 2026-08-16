import Link from "next/link";
import type { MaintenanceDueItem } from "@/lib/api/equipments";
import { formatDateOnly } from "@/lib/format/date-only";
import { MAINTENANCE_TONE_STYLES, maintenanceDaysLabel, maintenanceTone } from "@/lib/maintenance";
import { cn } from "@/lib/utils";

function intervalLabel(months: number): string {
  return `Cada ${months} ${months === 1 ? "mes" : "meses"}`;
}

interface AllMaintenancePlansPanelProps {
  items: MaintenanceDueItem[];
}

/**
 * Vista "Todos los planes": TODOS los equipos con plan activo, sin importar
 * cuándo vencen — donde se revisa que los planes quedaron bien configurados
 * y qué viene más adelante. El backend ya entrega los equipos ordenados por
 * nextMaintenanceAt ascendente (misma consulta que "Por vencer", sin tope
 * superior), así que no hay que reordenar acá.
 */
export function AllMaintenancePlansPanel({ items }: AllMaintenancePlansPanelProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Ningún equipo tiene un plan de mantenimiento activo todavía.
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-52 px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Equipo</th>
              <th className="w-48 px-4 py-3 font-medium">Ubicación</th>
              <th className="w-32 px-4 py-3 font-medium">Periodicidad</th>
              <th className="w-44 px-4 py-3 font-medium">Próxima fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const tone = maintenanceTone(item.daysRemaining);
              return (
                <tr key={item.id} className="hover:bg-muted/50">
                  <td className="p-0">
                    <Link
                      href={`/equipos/${item.id}`}
                      className="block truncate px-4 py-3"
                      title={item.client.name}
                    >
                      {item.client.name}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/equipos/${item.id}`} className="block truncate px-4 py-3">
                      {item.brand} {item.model}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link
                      href={`/equipos/${item.id}`}
                      className="block truncate px-4 py-3 text-muted-foreground"
                    >
                      {item.location ?? "Sin ubicación"}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/equipos/${item.id}`} className="block px-4 py-3 text-muted-foreground">
                      {intervalLabel(item.maintenanceIntervalMonths)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/equipos/${item.id}`} className="flex flex-col gap-1 px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          MAINTENANCE_TONE_STYLES[tone],
                        )}
                      >
                        {maintenanceDaysLabel(item.daysRemaining)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateOnly(item.nextMaintenanceAt)}
                      </span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {items.map((item) => {
          const tone = maintenanceTone(item.daysRemaining);
          return (
            <Link
              key={item.id}
              href={`/equipos/${item.id}`}
              className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {item.brand} {item.model}
                </span>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    MAINTENANCE_TONE_STYLES[tone],
                  )}
                >
                  {maintenanceDaysLabel(item.daysRemaining)}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{item.client.name}</span>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.location ?? "Sin ubicación"}</span>
                <span>{intervalLabel(item.maintenanceIntervalMonths)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Próxima: {formatDateOnly(item.nextMaintenanceAt)}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
