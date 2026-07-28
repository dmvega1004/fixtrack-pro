"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ComboSelectItem {
  id: string;
  label: string;
  hint?: string;
}

interface ComboSelectProps {
  items: ComboSelectItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  placeholder: string;
  emptyMessage: string;
}

/**
 * Select con búsqueda por texto, sin dependencia externa: un input filtra
 * una lista de botones. Pensado para listas de tamaño moderado (clientes,
 * equipos de un cliente) donde un <select> nativo no permite escribir para
 * filtrar y una librería de combobox sería sobrepeso para el caso de uso.
 */
export function ComboSelect({
  items,
  selectedId,
  onSelect,
  placeholder,
  emptyMessage,
}: ComboSelectProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selected = items.find((item) => item.id === selectedId) ?? null;

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

  if (!isOpen && selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{selected.label}</span>
          {selected.hint && (
            <span className="truncate text-xs text-muted-foreground">
              {selected.hint}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
        >
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        autoFocus={isOpen}
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                setQuery("");
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted",
                item.id === selectedId && "bg-muted",
              )}
            >
              <span className="font-medium">{item.label}</span>
              {item.hint && (
                <span className="text-xs text-muted-foreground">{item.hint}</span>
              )}
            </button>
          ))
        )}
      </div>
      {selected && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setIsOpen(false)}
        >
          Cancelar
        </Button>
      )}
    </div>
  );
}
