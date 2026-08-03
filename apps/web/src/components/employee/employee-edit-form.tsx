"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import type { Role } from "@/lib/api/auth";
import { updateEmployeeAction } from "@/app/(dashboard)/personal/actions";

interface EmployeeEditFormProps {
  employeeId: string;
  initialName: string;
  initialRole: Role;
  isSelf: boolean;
}

export function EmployeeEditForm({
  employeeId,
  initialName,
  initialRole,
  isSelf,
}: EmployeeEditFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<Role>(initialRole);
  const [isSaving, setIsSaving] = useState(false);

  const isValid = name.trim() !== "" && !isSaving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;

    setIsSaving(true);
    const result = await updateEmployeeAction(employeeId, {
      name: name.trim(),
      role,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo actualizar el empleado");
      return;
    }

    toast.success("Empleado actualizado");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Datos del empleado</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Rol *</Label>
            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              disabled={isSelf}
              className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABELS[value]}
                </option>
              ))}
            </select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">
                No puedes cambiar tu propio rol. Pídeselo a otro administrador.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={!isValid} className="w-full md:w-auto md:self-end">
        {isSaving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
