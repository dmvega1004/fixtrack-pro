import { notFound, redirect } from "next/navigation";
import { getQuote } from "@/lib/api/quotes";
import { getClients } from "@/lib/api/clients";
import { getEquipments } from "@/lib/api/equipments";
import { getSpareParts } from "@/lib/api/spare-parts";
import { getCompany } from "@/lib/api/company";
import { HttpError } from "@/lib/api/http";
import { QuoteForm } from "@/components/quotes/quote-form";
import { formatQuoteNumber } from "@/lib/format/quote-number";

interface EditarCotizacionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarCotizacionPage({ params }: EditarCotizacionPageProps) {
  const { id } = await params;

  let quote;
  try {
    quote = await getQuote(id);
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  // Solo se puede editar en DRAFT — una vez enviada, el backend rechaza
  // cualquier cambio salvo followUpAt (ver QuotesService.update). Si alguien
  // llega acá con una URL vieja (ej. justo después de enviarla), se manda
  // al detalle en vez de mostrar un formulario que de todas formas el
  // backend va a rechazar.
  if (quote.status !== "DRAFT") {
    redirect(`/cotizaciones/${quote.id}`);
  }

  const [clients, equipments, spareParts, company] = await Promise.all([
    getClients(),
    getEquipments(),
    getSpareParts(),
    getCompany(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar cotización</h1>
        <p className="text-sm text-muted-foreground">{formatQuoteNumber(quote.quoteNumber)}</p>
      </div>
      <QuoteForm
        mode="edit"
        quoteId={quote.id}
        clients={clients}
        equipments={equipments}
        spareParts={spareParts}
        company={company}
        initial={quote}
      />
    </div>
  );
}
