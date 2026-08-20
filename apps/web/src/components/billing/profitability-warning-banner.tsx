import { AlertTriangle } from "lucide-react";

/**
 * Aviso permanente de la vista de Rentabilidad — no es un detalle legal ni
 * un adorno. Sin esto, "80% de margen" se lee como utilidad y lleva a una
 * decisión de precio equivocada: el margen bruto de acá NO descuenta
 * sueldos, arriendo, transporte, viáticos ni gastos fijos de la empresa.
 */
export function ProfitabilityWarningBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
      <p>
        <strong>Margen bruto:</strong> ingresos menos costo de materiales y costos
        directos del trabajo. <strong>NO</strong> descuenta sueldos, arriendo,
        transporte, viáticos ni gastos fijos de la empresa.
      </p>
    </div>
  );
}
