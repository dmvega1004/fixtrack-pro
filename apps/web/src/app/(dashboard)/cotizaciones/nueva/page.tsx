import { getClients } from "@/lib/api/clients";
import { getEquipments } from "@/lib/api/equipments";
import { getSpareParts } from "@/lib/api/spare-parts";
import { getCompany } from "@/lib/api/company";
import { QuoteForm } from "@/components/quotes/quote-form";

export default async function NuevaCotizacionPage() {
  const [clients, equipments, spareParts, company] = await Promise.all([
    getClients(),
    getEquipments(),
    getSpareParts(),
    getCompany(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva cotización</h1>
        <p className="text-sm text-muted-foreground">
          Nace en borrador — el consecutivo se asigna al enviarla.
        </p>
      </div>
      <QuoteForm mode="create" clients={clients} equipments={equipments} spareParts={spareParts} company={company} />
    </div>
  );
}
