import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getQuote } from "@/lib/api/quotes";
import { getClient } from "@/lib/api/clients";
import { getCompany } from "@/lib/api/company";
import { HttpError } from "@/lib/api/http";
import { formatQuoteNumber } from "@/lib/format/quote-number";
import { QuoteDocument } from "@/components/quotes/print/quote-document";
import { QuotePrintActions } from "@/components/quotes/print/quote-print-actions";

interface DocumentoCotizacionPageProps {
  params: Promise<{ id: string }>;
}

/**
 * getQuote está envuelto en cache() de React, así que esta llamada y la de
 * la página de abajo se deduplican en una sola petición al backend dentro
 * del mismo render — mismo patrón que /ordenes/[id]/imprimir.
 */
export async function generateMetadata({
  params,
}: DocumentoCotizacionPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const quote = await getQuote(id);
    return {
      title: `${formatQuoteNumber(quote.quoteNumber)} - ${quote.client.name}`,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      return { title: "Cotización" };
    }
    throw error;
  }
}

/**
 * Fuera del grupo (dashboard): no hereda el layout con AppShell, pero por
 * eso repite acá la misma protección de sesión que aplica DashboardLayout
 * para el resto de rutas del panel — mismo patrón que /imprimir y
 * /cuenta-de-cobro. El módulo de cotizaciones es ADMIN/COORDINATOR
 * únicamente: el TECHNICIAN se redirige acá, igual que en
 * /(dashboard)/cotizaciones/layout.tsx (esta ruta vive fuera de ese
 * layout, así que no hereda esa protección — hay que repetirla).
 */
export default async function DocumentoCotizacionPage({
  params,
}: DocumentoCotizacionPageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role === "TECHNICIAN") {
    redirect("/");
  }

  let quote;
  try {
    quote = await getQuote(id);
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const [client, company] = await Promise.all([
    getClient(quote.clientId),
    getCompany(),
  ]);

  return (
    <div className="min-h-svh bg-neutral-100 pb-24 print:bg-white print:pb-0">
      <QuoteDocument quote={quote} client={client} company={company} />
      <QuotePrintActions quoteId={quote.id} />
    </div>
  );
}
