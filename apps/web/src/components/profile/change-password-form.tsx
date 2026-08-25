"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/password-input";
import { changePasswordAction } from "@/app/(dashboard)/perfil/actions";

const MIN_LENGTH = 8;

interface FormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_FORM: FormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

interface ChangePasswordFormProps {
  /**
   * Se dispara tras un cambio exitoso, además del toast y la limpieza de
   * campos. La pantalla de cambio obligatorio (/cambiar-contrasena) la usa
   * para redirigir al dashboard; /perfil no la pasa y se queda ahí.
   */
  onSuccess?: () => void;
}

/**
 * Sección "Seguridad" de /perfil: los tres roles pueden cambiar su propia
 * contraseña acá — antes el único camino era que un ADMIN editara al
 * usuario desde Personal (y para coordinador/técnico ni siquiera eso).
 * También es el formulario de la pantalla de cambio obligatorio
 * (/cambiar-contrasena) — mismo componente, no una copia.
 */
export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const newPasswordTooShort =
    form.newPassword.length > 0 && form.newPassword.length < MIN_LENGTH;
  const confirmMismatch =
    form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword;

  const isValid =
    form.currentPassword.length > 0 &&
    form.newPassword.length >= MIN_LENGTH &&
    form.newPassword === form.confirmPassword;

  function updateField(field: keyof FormState) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      // El error de "contraseña actual incorrecta" queda ligado a un
      // intento puntual — si el usuario vuelve a tocar cualquier campo,
      // ya no aplica (evita que un mensaje viejo confunda un intento nuevo).
      if (currentPasswordError) setCurrentPasswordError(null);
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;

    setIsSaving(true);
    const result = await changePasswordAction({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
    setIsSaving(false);

    if (!result.ok) {
      if (result.isCurrentPasswordError) {
        setCurrentPasswordError(result.message ?? "La contraseña actual no es correcta");
      } else {
        toast.error(result.message ?? "No se pudo cambiar la contraseña");
      }
      return;
    }

    setForm(EMPTY_FORM);
    toast.success("Contraseña actualizada");
    onSuccess?.();
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">Contraseña actual</Label>
        <PasswordInput
          id="currentPassword"
          autoComplete="current-password"
          required
          value={form.currentPassword}
          onChange={updateField("currentPassword")}
          aria-invalid={currentPasswordError ? true : undefined}
        />
        {currentPasswordError && (
          <p className="text-xs text-destructive">{currentPasswordError}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">Contraseña nueva</Label>
        <PasswordInput
          id="newPassword"
          autoComplete="new-password"
          required
          value={form.newPassword}
          onChange={updateField("newPassword")}
          aria-invalid={newPasswordTooShort ? true : undefined}
        />
        {newPasswordTooShort && (
          <p className="text-xs text-destructive">
            Debe tener al menos {MIN_LENGTH} caracteres.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirmar contraseña nueva</Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          required
          value={form.confirmPassword}
          onChange={updateField("confirmPassword")}
          aria-invalid={confirmMismatch ? true : undefined}
        />
        {confirmMismatch && (
          <p className="text-xs text-destructive">Las contraseñas no coinciden.</p>
        )}
      </div>

      <Button type="submit" disabled={!isValid || isSaving} className="self-start">
        {isSaving ? "Guardando..." : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
