import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { getUsers } from "@/lib/api/users";
import { ROLES } from "@/lib/roles";
import type { Role } from "@/lib/api/auth";
import { EmployeeFilterChips } from "@/components/employee/employee-filter-chips";
import { EmployeeCatalog } from "@/components/employee/employee-catalog";

function parseRole(value?: string): Role | undefined {
  return value && (ROLES as readonly string[]).includes(value) ? (value as Role) : undefined;
}

interface PersonalPageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function PersonalPage({ searchParams }: PersonalPageProps) {
  const params = await searchParams;
  const role = parseRole(params.role);

  const [session, employees] = await Promise.all([getSession(), getUsers(role)]);
  const isAdmin = session?.role === "ADMIN";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Personal</h1>
          <p className="text-sm text-muted-foreground">
            {employees.length} {employees.length === 1 ? "empleado" : "empleados"}
          </p>
        </div>
        {isAdmin && (
          <Link href="/personal/nuevo" className={buttonVariants({ variant: "default" })}>
            Invitar empleado
          </Link>
        )}
      </div>

      <EmployeeFilterChips currentRole={role} />

      {employees.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No hay empleados con este rol.
        </p>
      ) : (
        <EmployeeCatalog employees={employees} />
      )}
    </div>
  );
}
