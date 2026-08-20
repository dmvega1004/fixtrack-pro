import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfitabilityPeriodSelectorProps {
  from: string;
  to: string;
}

/**
 * Selector de período de la vista de Rentabilidad. Formulario GET plano
 * (sin JS): al enviarlo, el navegador recarga /cobros/rentabilidad con
 * ?from=&to= en la URL — el server component vuelve a pedir los 4
 * endpoints con el rango nuevo. Propio de esta vista, no toca el resto de
 * Cobros (que sigue anclado al mes calendario actual).
 */
export function ProfitabilityPeriodSelector({ from, to }: ProfitabilityPeriodSelectorProps) {
  return (
    <form
      action="/cobros/rentabilidad"
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from" className="text-xs text-muted-foreground">
          Desde
        </Label>
        <Input id="from" name="from" type="date" defaultValue={from} className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to" className="text-xs text-muted-foreground">
          Hasta
        </Label>
        <Input id="to" name="to" type="date" defaultValue={to} className="w-40" />
      </div>
      <Button type="submit" variant="outline" size="sm">
        Aplicar período
      </Button>
    </form>
  );
}
