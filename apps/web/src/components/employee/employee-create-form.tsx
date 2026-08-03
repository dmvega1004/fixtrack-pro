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
import { createEmployeeAction } from "@/app/(dashboard)/personal/actions";

const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

function generateSecurePassword(length = 14): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length]).join("");
}

export function EmployeeCreateForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isValid =
    name.trim() !== "" &&
    email.trim() !== "" &&
    role !== "" &&
    password.length >= 8 &&
    !isSaving;

  function handleGeneratePassword() {
    setPassword(generateSecurePassword());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;

    setIsSaving(true);
    const result = await createEmployeeAction({
      name: name.trim(),
      email: email.trim(),
      role: role as Role,
      password,
    });
    setIsSaving(false);

    if (!result.ok || !result.id) {
      toast.error(result.message ?? "No se pudo invitar al empleado");
      return;
    }

    toast.success("Empleado invitado");
    router.push(`/personal/${result.id}`);
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Rol *</Label>
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value as Role | "")}
                required
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
              >
                <option value="" disabled>
                  Selecciona un rol
                </option>
                {ROLES.map((value) => (
                  <option key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña inicial *</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                value={password}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                minLength={8}
                required
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                Generar contraseña segura
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo 8 caracteres. Debes comunicarle esta contraseña al empleado por un canal
              seguro: no se reenvía por correo automáticamente.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={!isValid} className="w-full md:w-auto md:self-end">
        {isSaving ? "Invitando..." : "Invitar empleado"}
      </Button>
    </form>
  );
}
