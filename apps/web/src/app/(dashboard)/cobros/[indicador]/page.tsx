import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCompany } from "@/lib/api/company";
import {
  getBilledOrders,
  getCollectedPayments,
  getReceivablesDetail,
  getOverdueReceivables,
} from "@/lib/api/billing";
import { formatCurrency } from "@/lib/format/currency";
import { BilledOrdersTable } from "@/components/billing/billed-orders-table";
import { CollectedPaymentsTable } from "@/components/billing/collected-payments-table";
import { ReceivableBreakdownTable } from "@/components/billing/receivable-breakdown-table";

const INDICATORS = ["facturado", "cobrado", "por-cobrar", "vencido"] as const;
type Indicador = (typeof INDICATORS)[number];

function isIndicador(value: string): value is Indicador {
  return (INDICATORS as readonly string[]).includes(value);
}

function currentMonthLabel(): string {
  return new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(
    new Date(),
  );
}

interface CobrosIndicadorPageProps {
  params: Promise<{ indicador: string }>;
}

export default async function CobrosIndicadorPage({
  params,
}: CobrosIndicadorPageProps) {
  const { indicador } = await params;
  if (!isIndicador(indicador)) {
    notFound();
  }

  const company = await getCompany();
  const monthLabel = currentMonthLabel();

  let title: string;
  let description: string;
  let total: string;
  let body: ReactNode;

  switch (indicador) {
    case "facturado": {
      const { items, total: t } = await getBilledOrders();
      title = "Facturado del mes";
      description = `Órdenes facturadas en ${monthLabel}, pagadas y pendientes.`;
      total = t;
      body = <BilledOrdersTable items={items} currency={company.currency} />;
      break;
    }
    case "cobrado": {
      const { items, total: t } = await getCollectedPayments();
      title = "Cobrado del mes";
      description = `Pagos registrados en ${monthLabel}, sin importar en qué mes se facturó la orden.`;
      total = t;
      body = <CollectedPaymentsTable items={items} currency={company.currency} />;
      break;
    }
    case "por-cobrar": {
      const { items, total: t } = await getReceivablesDetail();
      title = "Por cobrar";
      description = "Todas las órdenes cerradas con saldo pendiente, sin límite de fecha.";
      total = t;
      body = (
        <ReceivableBreakdownTable
          items={items}
          currency={company.currency}
          emptyMessage="No hay órdenes con saldo pendiente."
        />
      );
      break;
    }
    case "vencido": {
      const { items, total: t } = await getOverdueReceivables();
      title = "Vencido";
      description =
        "Órdenes por cobrar cuyos días transcurridos superan los días de crédito del cliente, de más vencida a menos.";
      total = t;
      body = (
        <ReceivableBreakdownTable
          items={items}
          currency={company.currency}
          emptyMessage="No hay órdenes vencidas."
        />
      );
      break;
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <Link
          href="/cobros"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a Cobros
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {body}

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
        <span className="text-sm font-medium text-muted-foreground">Total</span>
        <span className="min-w-0 text-lg font-semibold tabular-nums sm:text-xl">
          {formatCurrency(total, company.currency)}
        </span>
      </div>
    </div>
  );
}
