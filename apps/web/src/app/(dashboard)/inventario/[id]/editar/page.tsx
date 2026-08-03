import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSparePart } from "@/lib/api/spare-parts";
import { HttpError } from "@/lib/api/http";
import { SparePartForm } from "@/components/inventory/spare-part-form";
import { DeleteSparePartButton } from "@/components/inventory/delete-spare-part-button";

interface EditarRepuestoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarRepuestoPage({
  params,
}: EditarRepuestoPageProps) {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    redirect("/inventario");
  }

  const { id } = await params;

  let sparePart;
  try {
    sparePart = await getSparePart(id);
  } catch (error) {
    if (
      error instanceof HttpError &&
      (error.status === 404 || error.status === 400)
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar repuesto</h1>
        <p className="text-sm text-muted-foreground">
          {sparePart.sku} — {sparePart.name}
        </p>
      </div>
      <SparePartForm mode="edit" sparePartId={sparePart.id} initial={sparePart} />
      <div className="border-t border-border pt-4">
        <DeleteSparePartButton
          sparePartId={sparePart.id}
          partName={sparePart.name}
        />
      </div>
    </div>
  );
}
