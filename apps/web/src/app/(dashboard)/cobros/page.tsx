import Link from "next/link";
import { Wallet, TrendingUp, Clock, AlertTriangle, LineChart } from "lucide-react";
import { getBillingSummary, getReceivables, getClientBalances } from "@/lib/api/billing";
import { getWorkOrders } from "@/lib/api/work-orders";
import { getCompany } from "@/lib/api/company";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format/currency";
import { buildReceivableRows } from "@/lib/billing/receivable-rows";
import {
  ReceivablesPanel,
  type ReceivablesFilter,
} from "@/components/billing/receivables-panel";
import { ClientBalancesPanel } from "@/components/billing/client-balances-panel";
import { RecentPaymentsPanel } from "@/components/billing/recent-payments-panel";

function parseFilter(value?: string): ReceivablesFilter {
  return value === "vencidas" || value === "pagadas" ? value : "por-cobrar";
}

interface CobrosPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function CobrosPage({ searchParams }: CobrosPageProps) {
  const { filter } = await searchParams;
  const activeFilter = parseFilter(filter);

  const [summary, receivables, clientBalances, paidOrders, company] = await Promise.all([
    getBillingSummary(),
    getReceivables(),
    getClientBalances(),
    // GET /work-orders?paymentStatus=PAID — antes se pedían TODAS las
    // órdenes de la empresa para filtrar las pagadas acá. paymentStatus
    // solo llega a PAID después de que la orden se factura (ver
    // WorkOrdersService), así que ya implica un total congelado: no hace
    // falta filtrar status/totalAmount también.
    getWorkOrders({ paymentStatus: "PAID" }),
    getCompany(),
  ]);

  const rows = buildReceivableRows(receivables, paidOrders);

  const filteredRows = rows.filter((row) => {
    if (activeFilter === "vencidas") return row.isOverdue;
    if (activeFilter === "pagadas") return row.paymentStatus === "PAID";
    return row.paymentStatus !== "PAID";
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cobros</h1>
          <p className="text-sm text-muted-foreground">Facturación y cartera</p>
        </div>
        <Link href="/cobros/rentabilidad" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <LineChart className="size-4" />
          Rentabilidad
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          href="/cobros/facturado"
          label="Facturado del mes"
          value={formatCurrency(summary.billedThisMonth, company.currency)}
          icon={Wallet}
        />
        <KpiCard
          href="/cobros/cobrado"
          label="Cobrado del mes"
          value={formatCurrency(summary.collectedThisMonth, company.currency)}
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          href="/cobros/por-cobrar"
          label="Por cobrar"
          value={formatCurrency(summary.totalReceivable, company.currency)}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          href="/cobros/vencido"
          label="Vencido"
          value={formatCurrency(summary.totalOverdue, company.currency)}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <ReceivablesPanel rows={filteredRows} activeFilter={activeFilter} currency={company.currency} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ClientBalancesPanel balances={clientBalances} currency={company.currency} />
        <RecentPaymentsPanel payments={summary.recentPayments} currency={company.currency} />
      </div>
    </div>
  );
}
