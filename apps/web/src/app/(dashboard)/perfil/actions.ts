"use server";

import { serverFetch } from "@/lib/api/server-fetch";
import { HttpError } from "@/lib/api/http";

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResult {
  ok: boolean;
  message?: string;
  /**
   * true si el error es "la contraseña actual no es correcta" (401): el
   * formulario lo muestra en ese campo puntual, no como error general.
   * El resto de los casos (contraseña nueva igual a la actual, límite de
   * intentos, etc.) se muestran como toast — son menos frecuentes y no
   * corresponden a un campo específico que el usuario deba corregir ahí mismo.
   */
  isCurrentPasswordError?: boolean;
}

/**
 * PATCH /auth/password. `allowUnauthorized` en serverFetch: el backend
 * responde 401 cuando currentPassword no coincide, y ese 401 NO es una
 * sesión inválida — no debe desloguear a alguien que sigue autenticado,
 * solo mostrarle el error en el campo.
 */
export async function changePasswordAction(
  dto: ChangePasswordInput,
): Promise<ChangePasswordResult> {
  try {
    await serverFetch("/auth/password", {
      method: "PATCH",
      body: dto,
      allowUnauthorized: true,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        ok: false,
        message: error.message,
        isCurrentPasswordError: error.status === 401,
      };
    }
    throw error;
  }

  return { ok: true };
}
