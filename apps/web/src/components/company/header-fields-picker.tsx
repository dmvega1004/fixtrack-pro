"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  OPTIONAL_HEADER_FIELD_KEYS,
  HEADER_FIELD_LABELS,
  type OptionalHeaderFieldKey,
} from "@/lib/work-order-header-fields";

interface HeaderFieldsPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Checklist + reordenamiento del encabezado de la orden de trabajo —
 * SIN pantalla adicional ni librería de arrastrar: marcar un campo lo
 * agrega al final del arreglo (ese orden se pinta tal cual en el
 * documento — ver work-order-print-document.tsx), y las flechas
 * arriba/abajo reordenan los ya marcados. Solución más simple que
 * funciona para "el orden en que se marcan o se arrastran es el que se
 * guarda" sin construir drag-and-drop.
 */
export function HeaderFieldsPicker({ value, onChange }: HeaderFieldsPickerProps) {
  function toggle(key: OptionalHeaderFieldKey) {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key));
    } else {
      onChange([...value, key]);
    }
  }

  function move(key: string, direction: -1 | 1) {
    const index = value.indexOf(key);
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {OPTIONAL_HEADER_FIELD_KEYS.map((key) => {
        const checked = value.includes(key);
        const position = value.indexOf(key);
        return (
          <div key={key} className="flex items-center gap-2 rounded-lg border border-border p-2">
            <input
              id={`header-field-${key}`}
              type="checkbox"
              checked={checked}
              onChange={() => toggle(key)}
            />
            <label
              htmlFor={`header-field-${key}`}
              className="flex-1 cursor-pointer text-sm font-normal"
            >
              {HEADER_FIELD_LABELS[key]}
            </label>
            {checked && (
              <>
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                  {position + 1}
                </span>
                <button
                  type="button"
                  onClick={() => move(key, -1)}
                  disabled={position === 0}
                  className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  aria-label={`Mover "${HEADER_FIELD_LABELS[key]}" antes`}
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(key, 1)}
                  disabled={position === value.length - 1}
                  className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  aria-label={`Mover "${HEADER_FIELD_LABELS[key]}" después`}
                >
                  <ChevronDown className="size-4" />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
