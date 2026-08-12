import type { ReactNode } from "react";
import type { ActivityLogEntry } from "@/lib/api/activity-log";

/**
 * Bitácora de auditoría de la orden: registro de solo lectura, sin
 * acciones de edición ni borrado. No confundir con el "Historial de
 * órdenes" de la ficha del equipo, que es otra cosa.
 */
interface ActivityTabProps {
  entries: ActivityLogEntry[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayHeader(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today.getTime() - DAY_MS);

  if (dayKey(date) === dayKey(today)) return "Hoy";
  if (dayKey(date) === dayKey(yesterday)) return "Ayer";

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

interface DayGroup {
  key: string;
  header: string;
  entries: ActivityLogEntry[];
}

/** Agrupa por día de calendario, preservando el orden createdAt desc que ya trae el backend. */
function groupByDay(entries: ActivityLogEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];

  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const key = dayKey(date);
    const currentGroup = groups[groups.length - 1];

    if (currentGroup && currentGroup.key === key) {
      currentGroup.entries.push(entry);
    } else {
      groups.push({ key, header: dayHeader(date), entries: [entry] });
    }
  }

  return groups;
}

/** Frase en español por acción. Los valores ya llegan formateados desde el backend. */
function describeEvent({
  userName,
  action,
  oldValue,
  newValue,
}: ActivityLogEntry): ReactNode {
  switch (action) {
    case "ORDER_CREATED":
      return <>{userName} creó la orden</>;
    case "STATUS_CHANGED":
      return (
        <>
          {userName} cambió el estado de{" "}
          <s className="text-muted-foreground">{oldValue ?? "—"}</s> a{" "}
          <span className="font-medium text-primary">{newValue ?? "—"}</span>
        </>
      );
    case "PRIORITY_CHANGED":
      return (
        <>
          {userName} cambió la prioridad de{" "}
          <s className="text-muted-foreground">{oldValue ?? "—"}</s> a{" "}
          <span className="font-medium text-primary">{newValue ?? "—"}</span>
        </>
      );
    case "TECHNICIAN_ASSIGNED":
      if (oldValue && newValue) {
        return (
          <>
            {userName} reasignó la orden de{" "}
            <s className="text-muted-foreground">{oldValue}</s> a{" "}
            <span className="font-medium text-primary">{newValue}</span>
          </>
        );
      }
      if (newValue) {
        return (
          <>
            {userName} asignó la orden a{" "}
            <span className="font-medium text-primary">{newValue}</span>
          </>
        );
      }
      if (oldValue) {
        return (
          <>
            {userName} quitó la asignación de{" "}
            <s className="text-muted-foreground">{oldValue}</s>
          </>
        );
      }
      return <>{userName} actualizó la asignación de técnico</>;
    case "DIAGNOSIS_UPDATED":
      return <>{userName} actualizó el diagnóstico</>;
    case "OBSERVATIONS_UPDATED":
      return <>{userName} actualizó las observaciones</>;
    case "DESCRIPTION_UPDATED":
      return <>{userName} actualizó la descripción</>;
    case "EQUIPMENT_LINKED":
      return (
        <>
          {userName} vinculó el equipo{" "}
          <span className="font-medium">{newValue}</span>
        </>
      );
    case "EQUIPMENT_UNLINKED":
      return (
        <>
          {userName} desvinculó el equipo{" "}
          <span className="font-medium">{newValue}</span>
        </>
      );
    case "PART_ADDED":
      return (
        <>
          {userName} agregó un repuesto
          {newValue ? <>: {newValue}</> : null}
        </>
      );
    case "PART_REMOVED":
      return (
        <>
          {userName} quitó un repuesto
          {oldValue ? <>: {oldValue}</> : null}
        </>
      );
    case "PHOTO_ADDED":
      return <>{userName} agregó una foto</>;
    case "PHOTO_REMOVED":
      return <>{userName} eliminó una foto</>;
    case "BILLING_UPDATED":
      return <>{userName} actualizó la valorización de la orden</>;
    case "BILLED_AT_CHANGED":
      if (oldValue && newValue) {
        return (
          <>
            {userName} corrigió la fecha de facturación de{" "}
            <s className="text-muted-foreground">{oldValue}</s> a{" "}
            <span className="font-medium text-primary">{newValue}</span>
          </>
        );
      }
      return <>{userName} corrigió la fecha de facturación</>;
    case "COLLECTION_DOC_GENERATED":
      return (
        <>
          {userName} generó la cuenta de cobro
          {newValue ? <> {newValue}</> : null}
        </>
      );
    case "PAYMENT_REGISTERED":
      return (
        <>
          {userName} registró un pago
          {newValue ? <> de {newValue}</> : null}
        </>
      );
    case "PAYMENT_DELETED":
      return (
        <>
          {userName} eliminó un pago
          {oldValue ? <> de {oldValue}</> : null}
        </>
      );
    default:
      return <>{userName} realizó un cambio en la orden</>;
  }
}

export function ActivityTab({ entries }: ActivityTabProps) {
  if (entries.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-muted-foreground">
          Aún no hay actividad registrada en esta orden.
        </p>
      </div>
    );
  }

  const groups = groupByDay(entries);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.header}
          </h3>
          <ul className="flex flex-col">
            {group.entries.map((entry, index) => {
              const isLast = index === group.entries.length - 1;
              return (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                    {!isLast && (
                      <span className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className={isLast ? "flex-1" : "flex-1 pb-4"}>
                    <p className="text-sm text-foreground">
                      {describeEvent(entry)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatTime(new Date(entry.createdAt))}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
