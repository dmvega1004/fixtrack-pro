import { Wallet, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { getBillingSummary, getReceivables, getClientBalances } from "@/lib/api/billing";
import { getWorkOrders } from "@/lib/api/work-orders";
import { getCompany } from "@/lib/api/company";
import { KpiCard } from "@/components/dashboard/kpi-card";
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

  const [summary, receivables, clientBalances, workOrders, company] = await Promise.all([
    getBillingSummary(),
    getReceivables(),
    getClientBalances(),
    getWorkOrders(),
    getCompany(),
  ]);

  // GET /billing/receivables solo devuelve PENDING/PARTIAL (saldo pendiente,
  // ver el backend); para el chip "Pagadas" reutilizamos GET /work-orders
  // (ya visible para ADMIN) filtrando las cerradas con paymentStatus PAID.
  // Si está PAID, lo abonado siempre es exactamente el total (invariante
  // que mantiene PaymentsService), así que no hace falta otro fetch.
  const paidOrders = workOrders.filter(
    (order) =>
      (order.status === "COMPLETED" || order.status === "DELIVERED") &&
      order.paymentStatus === "PAID" &&
      order.totalAmount !== null,
  );

  const rows = buildReceivableRows(receivables, paidOrders);

  const filteredRows = rows.filter((row) => {
    if (activeFilter === "vencidas") return row.isOverdue;
    if (activeFilter === "pagadas") return row.paymentStatus === "PAID";
    return row.paymentStatus !== "PAID";
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Cobros</h1>
        <p className="text-sm text-muted-foreground">Facturación y cartera</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Facturado del mes"
          value={formatCurrency(summary.billedThisMonth, company.currency)}
          icon={Wallet}
        />
        <KpiCard
          label="Cobrado del mes"
          value={formatCurrency(summary.collectedThisMonth, company.currency)}
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          label="Por cobrar"
          value={formatCurrency(summary.totalReceivable, company.currency)}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
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
