"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resetEmployeePasswordAction } from "@/app/(dashboard)/personal/actions";

const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

function generateSecurePassword(length = 14): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length]).join("");
}

interface ResetPasswordFormProps {
  employeeId: string;
}

export function ResetPasswordForm({ employeeId }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isValid = password.length >= 8 && !isSaving;

  function handleGeneratePassword() {
    setPassword(generateSecurePassword());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;

    setIsSaving(true);
    const result = await resetEmployeePasswordAction(employeeId, password);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo restablecer la contraseña");
      return;
    }

    setPassword("");
    toast.success("Contraseña restablecida");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Restablecer contraseña</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">Nueva contraseña</Label>
            <div className="flex gap-2">
              <Input
                id="newPassword"
                value={password}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setPassword(event.target.value)
                }
                minLength={8}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                Generar contraseña segura
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo 8 caracteres. Comunícasela al empleado por un canal seguro.
            </p>
          </div>
          <Button type="submit" disabled={!isValid} className="w-full md:w-auto md:self-end">
            {isSaving ? "Guardando..." : "Restablecer contraseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
