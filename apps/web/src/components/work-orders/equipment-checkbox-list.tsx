"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface EquipmentCheckboxItem {
  id: string;
  label: string;
  hint?: string;
}

interface EquipmentCheckboxListProps {
  items: EquipmentCheckboxItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  placeholder: string;
  emptyMessage: string;
}

/**
 * Lista con búsqueda + checkboxes para selección múltiple (equipos de un
 * cliente). Solo maneja la lista: las etiquetas de lo seleccionado las
 * dibuja el formulario que lo usa, porque ahí también viven los equipos
 * nuevos creados en línea (que no tienen entrada en `items`).
 */
export function EquipmentCheckboxList({
  items,
  selectedIds,
  onToggle,
  placeholder,
  emptyMessage,
}: EquipmentCheckboxListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const pool = normalized
      ? items.filter(
          (item) =>
            item.label.toLowerCase().includes(normalized) ||
            item.hint?.toLowerCase().includes(normalized),
        )
      : items;
    return pool.slice(0, 30);
  }, [items, query]);

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          filtered.map((item) => {
            const checked = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                aria-pressed={checked}
                className={cn(
                  "flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted",
                  checked && "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 flex-shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {checked && <Check className="size-3" />}
                </span>
                <span className="flex flex-col">
                  <span className="font-medium">{item.label}</span>
                  {item.hint && (
                    <span className="text-xs text-muted-foreground">{item.hint}</span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
