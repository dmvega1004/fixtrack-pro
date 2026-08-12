import Link from "next/link";

interface EmptySearchStateProps {
  term: string;
  /** URL con los demás filtros activos (status/priority/unassigned) pero sin `q`. */
  clearHref: string;
}

/**
 * Estado vacío cuando hay una búsqueda activa sin resultados. Distinto de
 * EmptyOrdersState a propósito: ese invita a crear una orden nueva, que no
 * es lo que el usuario quiere cuando su búsqueda no encontró nada.
 */
export function EmptySearchState({ term, clearHref }: EmptySearchStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <p className="text-sm text-muted-foreground">
        No se encontraron órdenes para «{term}»
      </p>
      <Link href={clearHref} className="text-sm font-medium text-primary">
        Limpiar búsqueda
      </Link>
    </div>
  );
}
