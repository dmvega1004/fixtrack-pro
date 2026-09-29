"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { LinkableQuote, WorkOrderQuoteSummary } from "@/lib/api/work-orders";
import { formatLinkableQuoteLabel } from "@/lib/format/linkable-quote";
import { formatQuoteNumber } from "@/lib/format/quote-number";
import {
  changeQuoteLinkAction,
  listLinkableQuotesAction,
} from "@/app/(dashboard)/ordenes/[id]/actions";

const NO_QUOTE = "";

interface QuoteLinkEditorProps {
  orderId: string;
  clientId: string;
  currentQuote: WorkOrderQuoteSummary | null;
  isTerminal: boolean;
}

/**
 * "Cotización que ejecuta" — mismo molde que PriorityEditor. Los tres
 * roles pueden enlazar y cambiar el enlace; las opciones llegan sin
 * ningún monto (ver listLinkableQuotesAction). Sin señal no se muestra el
 * selector: no hay cómo consultar las cotizaciones, y el enlace no viaja
 * por la cola de pendientes.
 */
export function QuoteLinkEditor({
  orderId,
  clientId,
  currentQuote,
  isTerminal,
}: QuoteLinkEditorProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const currentId = currentQuote?.id ?? NO_QUOTE;
  const [selected, setSelected] = useState(currentId);
  const [options, setOptions] = useState<LinkableQuote[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOnline || isTerminal) return;
    let cancelled = false;
    void listLinkableQuotesAction(clientId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        toast.error(result.message ?? "No se pudieron cargar las cotizaciones");
        return;
      }
      setOptions(result.quotes ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [clientId, isOnline, isTerminal]);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelected(event.target.value);
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await changeQuoteLinkAction(
      orderId,
      selected === NO_QUOTE ? null : selected,
    );
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo cambiar la cotización");
      setSelected(currentId);
      return;
    }

    toast.success(
      selected === NO_QUOTE ? "Cotización desenlazada" : "Cotización enlazada",
    );
    router.refresh();
  }

  const currentLabel = currentQuote
    ? `${formatQuoteNumber(currentQuote.quoteNumber)} — ${currentQuote.title}`
    : "Ninguna";

  // Sin señal u orden sellada: solo lectura, sin selector.
  if (!isOnline || isTerminal) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Cotización que ejecuta</span>
        <p className="text-sm text-muted-foreground">{currentLabel}</p>
      </div>
    );
  }

  // La enlazada puede no venir en las opciones (p. ej. quedó REJECTED
  // después de enlazarla): se conserva como opción para no perderla.
  const hasCurrentInOptions =
    currentQuote === null ||
    (options ?? []).some((quote) => quote.id === currentQuote.id);

  // min-w-0 en ambos niveles: el texto de las opciones es largo y, sin
  // esto, el <select> impone su ancho y desborda la página.
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor="quoteId" className="text-sm font-medium">
        Cotización que ejecuta (opcional)
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <select
          id="quoteId"
          value={selected}
          onChange={handleChange}
          disabled={options === null}
          className="h-9 w-full min-w-0 flex-1 truncate rounded-lg border border-border bg-background px-2.5 text-sm text-foreground disabled:opacity-50"
        >
          <option value={NO_QUOTE}>
            {options === null ? "Cargando cotizaciones…" : "Ninguna"}
          </option>
          {!hasCurrentInOptions && currentQuote && (
            <option value={currentQuote.id}>{currentLabel}</option>
          )}
          {(options ?? []).map((quote) => (
            <option key={quote.id} value={quote.id}>
              {formatLinkableQuoteLabel(quote)}
            </option>
          ))}
        </select>
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving || selected === currentId}
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
