import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SparePartForm } from "@/components/inventory/spare-part-form";

export default async function NuevoRepuestoPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    redirect("/inventario");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo repuesto</h1>
        <p className="text-sm text-muted-foreground">
          Agrega un repuesto al catálogo de inventario.
        </p>
      </div>
      <SparePartForm mode="create" />
    </div>
  );
}
