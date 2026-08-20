import Link from "next/link";
import { ArrowLeft, DollarSign, Wallet, TrendingUp, Percent } from "lucide-react";
import { getCompany } from "@/lib/api/company";
import {
  getProfitabilitySummary,
  getProfitabilityOrders,
  getProfitabilityByClient,
  getProfitabilityMonthly,
  type ProfitabilityOrderSortBy,
  type ProfitabilitySortOrder,
} from "@/lib/api/profitability";
import { formatCurrency } from "@/lib/format/currency";
import { formatMarginPercent } from "@/lib/format/margin";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProfitabilityWarningBanner } from "@/components/billing/profitability-warning-banner";
import { ProfitabilityPeriodSelector } from "@/components/billing/profitability-period-selector";
import { ProfitabilityOrdersTable } from "@/components/billing/profitability-orders-table";
import { ProfitabilityRankingPanel } from "@/components/billing/profitability-ranking-panel";
import { ProfitabilityByClientTable } from "@/components/billing/profitability-by-client-table";
import { ProfitabilityTrendPanel } from "@/components/billing/profitability-trend-panel";

/** "YYYY-MM-DD" del primer y último día del mes calendario ACTUAL (hora local) — mismo período por defecto que ProfitabilityService.resolveRange en el backend. */
function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: toIso(start), to: toIso(end) };
}

function isValidSortBy(value?: string): value is ProfitabilityOrderSortBy {
  return value === "margin" || value === "marginPercent";
}

interface RentabilidadPageProps {
  searchParams: Promise<{ from?: string; to?: string; sortBy?: string; order?: string }>;
}

/**
 * Vista de Rentabilidad — DENTRO del módulo de Cobros (mismo RBAC, ADMIN
 * exclusivo, ver CobrosLayout), con su propio selector de período. Responde
 * una pregunta distinta a las 4 tarjetas de /cobros: Cobros dice cuánto le
 * deben a la empresa; esto dice cuáles trabajos dejan plata. Solo lectura:
 * es un espejo de las órdenes ya cerradas, nada se edita acá.
 */
export default async function RentabilidadPage({ searchParams }: RentabilidadPageProps) {
  const params = await searchParams;
  const defaults = currentMonthRange();
  const from = params.from ?? defaults.from;
  const to = params.to ?? defaults.to;
  const sortBy = isValidSortBy(params.sortBy) ? params.sortBy : undefined;
  const order: ProfitabilitySortOrder = params.order === "asc" ? "asc" : "desc";

  const range = { from, to };

  const [company, summary, orders, byClient, monthly] = await Promise.all([
    getCompany(),
    getProfitabilitySummary(range),
    getProfitabilityOrders(range, sortBy, order),
    getProfitabilityByClient(range),
    getProfitabilityMonthly(),
  ]);

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

      <div>
        <h1 className="text-2xl font-semibold">Rentabilidad</h1>
        <p className="text-sm text-muted-foreground">
          Margen bruto de las órdenes cerradas del período: cuáles trabajos dejan plata.
        </p>
      </div>

      <ProfitabilityWarningBanner />

      <ProfitabilityPeriodSelector from={from} to={to} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Ingreso (sin IVA)"
          value={formatCurrency(summary.income, company.currency)}
          icon={DollarSign}
        />
        <KpiCard
          label="Costo directo"
          value={formatCurrency(summary.cost, company.currency)}
          icon={Wallet}
        />
        <KpiCard
          label="Margen bruto"
          value={formatCurrency(summary.margin, company.currency)}
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          label="% de margen"
          value={formatMarginPercent(summary.marginPercent)}
          icon={Percent}
        />
      </div>

      <ProfitabilityOrdersTable
        items={orders}
        currency={company.currency}
        from={from}
        to={to}
        sortBy={sortBy}
        order={order}
      />

      <ProfitabilityRankingPanel orders={orders} currency={company.currency} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProfitabilityByClientTable items={byClient} currency={company.currency} />
        <ProfitabilityTrendPanel points={monthly} currency={company.currency} />
      </div>
    </div>
  );
}
