import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getMaintenanceDue, type MaintenanceDueItem } from "@/lib/api/equipments";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateOnly } from "@/lib/format/date-only";
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

type Tone = "green" | "amber" | "red";

const TONE_STYLES: Record<Tone, string> = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};

/** Verde &gt;30 días, ámbar ≤30 días, rojo ya vencido — mismo criterio que la ficha del equipo. */
function toneFor(daysRemaining: number): Tone {
  if (daysRemaining < 0) return "red";
  if (daysRemaining <= 30) return "amber";
  return "green";
}

function daysLabel(daysRemaining: number): string {
  if (daysRemaining < 0) {
    const overdue = Math.abs(daysRemaining);
    return `Venció hace ${overdue} día${overdue === 1 ? "" : "s"}`;
  }
  if (daysRemaining === 0) return "Vence hoy";
  return `Faltan ${daysRemaining} día${daysRemaining === 1 ? "" : "s"}`;
}

function suggestedDescription(group: ClientGroup): string {
  const count = group.items.length;
  return `Mantenimiento preventivo programado — ${count} equipo${count === 1 ? "" : "s"} de ${group.clientName}.`;
}

export default async function MantenimientoPage() {
  const items = await getMaintenanceDue();
  const groups = groupByClient(items);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Mantenimientos por vencer</h1>
        <p className="text-sm text-muted-foreground">
          Equipos con plan de mantenimiento activo, vencidos o por vencer en
          los próximos 30 días — agrupados por cliente.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No hay mantenimientos por vencer.
        </div>
      ) : (
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
                    const tone = toneFor(item.daysRemaining);
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
                              TONE_STYLES[tone],
                            )}
                          >
                            {daysLabel(item.daysRemaining)}
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
      )}
    </div>
  );
}
