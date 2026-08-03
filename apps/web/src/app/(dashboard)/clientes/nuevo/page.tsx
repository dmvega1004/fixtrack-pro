import { ClientForm } from "@/components/client/client-form";

export default function NuevoClientePage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
        <p className="text-sm text-muted-foreground">
          Registra un cliente para asociarle equipos y órdenes de trabajo.
        </p>
      </div>
      <ClientForm mode="create" />
    </div>
  );
}
