import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { EmployeeCreateForm } from "@/components/employee/employee-create-form";

export default async function NuevoEmpleadoPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    redirect("/personal");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Invitar empleado</h1>
        <p className="text-sm text-muted-foreground">
          Crea una cuenta para un nuevo miembro del equipo.
        </p>
      </div>
      <EmployeeCreateForm />
    </div>
  );
}
