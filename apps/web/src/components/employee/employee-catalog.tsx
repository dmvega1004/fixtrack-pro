"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { EmployeeAvatar } from "./employee-avatar";
import { RoleBadge } from "./role-badge";
import { formatDate } from "@/lib/format/dates";
import type { Employee } from "@/lib/api/users";

interface EmployeeCatalogProps {
  employees: Employee[];
}

export function EmployeeCatalog({ employees }: EmployeeCatalogProps) {
  const [query, setQuery] = useState("");

  // Filtrado en memoria: la nómina es de tamaño moderado por empresa.
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return employees;
    return employees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(normalized) ||
        employee.email.toLowerCase().includes(normalized),
    );
  }, [employees, query]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre o correo..."
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No se encontraron empleados con esta búsqueda
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Empleado</th>
                  <th className="px-4 py-3 font-medium">Correo</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Ingreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((employee) => (
                  <tr key={employee.id} className="hover:bg-muted/50">
                    <td className="p-0">
                      <Link
                        href={`/personal/${employee.id}`}
                        className="flex items-center gap-3 px-4 py-3 font-medium"
                      >
                        <EmployeeAvatar name={employee.name} />
                        {employee.name}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/personal/${employee.id}`}
                        className="block px-4 py-3 text-muted-foreground"
                      >
                        {employee.email}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/personal/${employee.id}`}
                        className="block px-4 py-3"
                      >
                        <RoleBadge role={employee.role} />
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/personal/${employee.id}`}
                        className="block px-4 py-3 text-muted-foreground"
                      >
                        {formatDate(employee.createdAt)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((employee) => (
              <Link
                key={employee.id}
                href={`/personal/${employee.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <EmployeeAvatar name={employee.name} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{employee.name}</span>
                    <RoleBadge role={employee.role} />
                  </div>
                  <span className="truncate text-sm text-muted-foreground">
                    {employee.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Desde {formatDate(employee.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
