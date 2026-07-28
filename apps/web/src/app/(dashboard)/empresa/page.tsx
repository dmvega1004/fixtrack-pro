import { getCompany } from "@/lib/api/company";
import { CompanyForm } from "@/components/company/company-form";

export default async function EmpresaPage() {
  const company = await getCompany();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Mi empresa</h1>
        <p className="text-sm text-muted-foreground">
          Estos datos aparecen en el membrete de los documentos que imprimes
          o compartes con tus clientes.
        </p>
      </div>
      <CompanyForm company={company} />
    </div>
  );
}
