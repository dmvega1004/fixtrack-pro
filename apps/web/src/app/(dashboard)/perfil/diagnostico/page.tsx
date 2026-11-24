import Link from "next/link";
import { ConnectionDiagnostics } from "@/components/diagnostics/connection-diagnostics";

/** Fuera del menú a propósito — se llega desde un enlace discreto en /perfil. */
export default function DiagnosticoPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Diagnóstico de conexión</h1>
        <p className="text-sm text-muted-foreground">
          Solo lectura. Se actualiza cada segundo: puedes activar el modo avión con esta
          página abierta.
        </p>
      </div>
      <ConnectionDiagnostics />
      <Link href="/perfil" className="text-sm text-muted-foreground underline">
        Volver al perfil
      </Link>
    </div>
  );
}
