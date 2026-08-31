import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClient } from "@/lib/api/clients";
import { getRetentions, type Retention } from "@/lib/api/retentions";
import { HttpError } from "@/lib/api/http";
import { ClientForm } from "@/components/client/client-form";
import { DeleteClientButton } from "@/components/client/delete-client-button";

interface EditarClientePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarClientePage({ params }: EditarClientePageProps) {
  const { id } = await params;
  const session = await getSession();
  const canConfigureRetentions = session?.role === "ADMIN";

  let client;
  let retentionCatalog: Retention[];
  try {
    // En paralelo: getRetentions() es ADMIN-only en el backend, solo se
    // pide si el rol efectivamente puede configurarlas.
    [client, retentionCatalog] = await Promise.all([
      getClient(id),
      canConfigureRetentions ? getRetentions() : Promise.resolve([]),
    ]);
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar cliente</h1>
        <p className="text-sm text-muted-foreground">{client.name}</p>
      </div>
      <ClientForm
        mode="edit"
        clientId={client.id}
        initial={client}
        canConfigureReportFormat={
          session?.role === "ADMIN" || session?.role === "COORDINATOR"
        }
        canConfigureRetentions={canConfigureRetentions}
        retentionCatalog={retentionCatalog}
      />

      {session?.role === "ADMIN" && (
        <div className="border-t border-border pt-4">
          <DeleteClientButton clientId={client.id} clientName={client.name} />
        </div>
      )}
    </div>
  );
}
