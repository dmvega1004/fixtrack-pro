import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getQuotes } from "@/lib/api/quotes";
import { getCompany } from "@/lib/api/company";
import { QuoteStatusFilterChips } from "@/components/quotes/quote-status-filter-chips";
import { QuotesSearchInput } from "@/components/quotes/quotes-search-input";
import { QuotesTable } from "@/components/quotes/quotes-table";
import type { QuoteStatusFilter } from "@/lib/api/quotes";

const VALID_FILTERS: QuoteStatusFilter[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

function parseStatus(value?: string): QuoteStatusFilter | undefined {
  return value && (VALID_FILTERS as string[]).includes(value)
    ? (value as QuoteStatusFilter)
    : undefined;
}

interface CotizacionesPageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function CotizacionesPage({ searchParams }: CotizacionesPageProps) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const search = params.q?.trim() || undefined;

  const [quotes, company] = await Promise.all([
    getQuotes({ status, search }),
    getCompany(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cotizaciones</h1>
          <p className="text-sm text-muted-foreground">
            {quotes.length} {quotes.length === 1 ? "resultado" : "resultados"}
          </p>
        </div>
        <Link href="/cotizaciones/nueva" className={buttonVariants({ variant: "default" })}>
          <Plus className="size-4" />
          Nueva cotización
        </Link>
      </div>

      <QuotesSearchInput key={search ?? ""} initialValue={search ?? ""} />

      <QuoteStatusFilterChips currentStatus={status} currentSearch={search} />

      <QuotesTable quotes={quotes} currency={company.currency} />
    </div>
  );
}
