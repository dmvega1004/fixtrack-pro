"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 400;

interface QuotesSearchInputProps {
  /** Valor inicial resuelto en el servidor (searchParams.q). Ver OrdersSearchInput: mismo patrón (key distinto para remontar en vez de sincronizar con un efecto). */
  initialValue: string;
}

/**
 * Buscador de una sola casilla de /cotizaciones — mismo componente y
 * comportamiento que OrdersSearchInput: número, cliente, NIT o título, sin
 * que el usuario elija en qué campo busca. El término vive en `q` en la URL.
 */
export function QuotesSearchInput({ initialValue }: QuotesSearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function commit(term: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (term.trim()) {
      params.set("q", term.trim());
    } else {
      params.delete("q");
    }
    const query = params.toString();
    router.replace(query ? `/cotizaciones?${query}` : "/cotizaciones", {
      scroll: false,
    });
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setValue(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(next), DEBOUNCE_MS);
  }

  function handleClear() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setValue("");
    commit("");
  }

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Buscar por número, cliente, NIT o título..."
        aria-label="Buscar cotizaciones"
        className="pl-8 pr-8"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
