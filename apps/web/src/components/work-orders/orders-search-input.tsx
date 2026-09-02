"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useOnlineStatus } from "@/hooks/use-online-status";

const DEBOUNCE_MS = 400;

interface OrdersSearchInputProps {
  /**
   * Valor inicial resuelto en el servidor (searchParams.q). Cuando cambia
   * por fuera de este input (ej. el enlace "Limpiar búsqueda"), el padre le
   * pasa un `key` distinto (ver ordenes/page.tsx) para remontarlo con el
   * valor nuevo — el patrón recomendado en vez de sincronizar con un efecto.
   */
  initialValue: string;
}

/**
 * Buscador de una sola casilla de /ordenes: OT, cuenta de cobro, cliente,
 * NIT o descripción — el usuario no elige en qué campo busca. El término
 * vive en el parámetro `q` de la URL (no en estado local): así sobrevive al
 * refresco, se puede compartir y funciona con el botón atrás.
 */
export function OrdersSearchInput({ initialValue }: OrdersSearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();
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
    // scroll: false — no saltar al tope de la página en cada tecleo.
    router.replace(query ? `/ordenes?${query}` : "/ordenes", {
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
    <div className="flex flex-col gap-1">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={value}
          onChange={handleChange}
          disabled={!isOnline}
          placeholder={
            isOnline
              ? "Buscar por OT, cliente, NIT o descripción..."
              : "Búsqueda no disponible sin conexión"
          }
          aria-label="Buscar órdenes"
          className="pl-8 pr-8"
        />
        {value && isOnline && (
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
      {!isOnline && (
        <p className="text-xs text-muted-foreground">
          Sin conexión — la búsqueda y los filtros de abajo no están disponibles.
        </p>
      )}
    </div>
  );
}
