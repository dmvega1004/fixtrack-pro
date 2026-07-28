"use client";

import type { ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PRIORITY_LABELS,
  type Priority,
} from "@/components/shared/priority-badge";

const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];

export function PriorityFilterSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPriority = searchParams.get("priority") ?? "";

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (event.target.value) {
      params.set("priority", event.target.value);
    } else {
      params.delete("priority");
    }
    const query = params.toString();
    router.push(query ? `/ordenes?${query}` : "/ordenes");
  }

  return (
    <select
      value={currentPriority}
      onChange={handleChange}
      aria-label="Filtrar por prioridad"
      className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
    >
      <option value="">Todas las prioridades</option>
      {PRIORITIES.map((priority) => (
        <option key={priority} value={priority}>
          {PRIORITY_LABELS[priority]}
        </option>
      ))}
    </select>
  );
}
