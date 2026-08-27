"use server";

import { revalidatePath } from "next/cache";
import { toFriendlyActionMessage } from "@/lib/api/http";
import {
  createUser,
  updateUser,
  deleteUser,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from "@/lib/api/users";

export interface EmployeeActionResult {
  ok: boolean;
  message?: string;
  id?: string;
}

export async function createEmployeeAction(
  dto: CreateEmployeeInput,
): Promise<EmployeeActionResult> {
  try {
    const employee = await createUser(dto);
    revalidatePath("/personal");
    return { ok: true, id: employee.id };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}

/** Cambia nombre y/o rol. El backend rechaza el auto-cambio de rol y la degradación del último Admin. */
export async function updateEmployeeAction(
  id: string,
  dto: Pick<UpdateEmployeeInput, "name" | "role">,
): Promise<EmployeeActionResult> {
  try {
    await updateUser(id, dto);
    revalidatePath("/personal");
    revalidatePath(`/personal/${id}`);
    return { ok: true, id };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}

/** Acción separada del resto de la ficha: solo toca la contraseña. */
export async function resetEmployeePasswordAction(
  id: string,
  password: string,
): Promise<EmployeeActionResult> {
  try {
    await updateUser(id, { password });
    revalidatePath(`/personal/${id}`);
    return { ok: true, id };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}

/** 403/409 anti-lockout (auto-eliminación, último Admin) llegan tal cual del backend. */
export async function deleteEmployeeAction(id: string): Promise<EmployeeActionResult> {
  try {
    await deleteUser(id);
    revalidatePath("/personal");
    return { ok: true };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}
