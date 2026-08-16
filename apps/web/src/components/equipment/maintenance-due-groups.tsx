import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { MaintenanceDueItem } from "@/lib/api/equipments";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateOnly } from "@/lib/format/date-only";
import { MAINTENANCE_TONE_STYLES, maintenanceDaysLabel, maintenanceTone } from "@/lib/maintenance";
import { cn } from "@/lib/utils";

interface ClientGroup {
  clientId: string;
  clientName: string;
  items: MaintenanceDueItem[];
}

/**
 * La ALERTA es por EQUIPO (lo que devuelve el backend); esta pantalla los
 * AGRUPA POR CLIENTE para poder proponer una sola orden que cubra a todos
 * los equipos vencidos de ese cliente — misma regla de "una orden por
 * cobro, no por equipo" del resto del sistema. El backend ya entrega los
 * equipos del más vencido al menos urgente (nextMaintenanceAt asc); un Map
 * preserva ese orden de inserción, así que los grupos también quedan
 * ordenados por su equipo más urgente.
 */
function groupByClient(items: MaintenanceDueItem[]): ClientGroup[] {
  const groups = new Map<string, ClientGroup>();

  for (const item of items) {
    const existing = groups.get(item.client.id);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(item.client.id, {
        clientId: item.client.id,
        clientName: item.client.name,
        items: [item],
      });
    }
  }

  return [...groups.values()];
}

function suggestedDescription(group: ClientGroup): string {
  const count = group.items.length;
  return `Mantenimiento preventivo programado — ${count} equipo${count === 1 ? "" : "s"} de ${group.clientName}.`;
}

interface MaintenanceDueGroupsProps {
  items: MaintenanceDueItem[];
}

/** Vista "Por vencer": equipos vencidos o dentro de la ventana, agrupados por cliente. */
export function MaintenanceDueGroups({ items }: MaintenanceDueGroupsProps) {
  const groups = groupByClient(items);

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No hay mantenimientos por vencer.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        // ⚠️ Este link solo PRECARGA el formulario de orden nueva — no
        // crea nada. El usuario revisa cliente/equipos/descripción,
        // asigna técnico y confirma allá.
        const equipmentIds = group.items.map((item) => item.id).join(",");
        const scheduleHref =
          `/ordenes/nueva?cliente=${group.clientId}` +
          `&equipos=${equipmentIds}` +
          `&tipo=PREVENTIVE` +
          `&descripcion=${encodeURIComponent(suggestedDescription(group))}`;

        return (
          <Card key={group.clientId}>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{group.clientName}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {group.items.length} equipo{group.items.length === 1 ? "" : "s"} por vencer
                </p>
              </div>
              <Link
                href={scheduleHref}
                className={buttonVariants({ variant: "default", size: "sm" })}
              >
                <CalendarClock className="size-4" />
                Programar mantenimiento
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              {group.items.map((item) => {
                const tone = maintenanceTone(item.daysRemaining);
                return (
                  <Link
                    key={item.id}
                    href={`/equipos/${item.id}`}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium">
                        {item.brand} {item.model}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {item.location ?? "Sin ubicación"}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          MAINTENANCE_TONE_STYLES[tone],
                        )}
                      >
                        {maintenanceDaysLabel(item.daysRemaining)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateOnly(item.nextMaintenanceAt)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
