"use server";

import { revalidatePath } from "next/cache";
import { HttpError } from "@/lib/api/http";
import {
  createClient,
  updateClient,
  deleteClient,
  type CreateClientInput,
  type UpdateClientInput,
} from "@/lib/api/clients";

export interface ClientActionResult {
  ok: boolean;
  message?: string;
  id?: string;
}

export async function createClientAction(
  dto: CreateClientInput,
): Promise<ClientActionResult> {
  try {
    const client = await createClient(dto);
    revalidatePath("/clientes");
    return { ok: true, id: client.id };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

export async function updateClientAction(
  id: string,
  dto: UpdateClientInput,
): Promise<ClientActionResult> {
  try {
    await updateClient(id, dto);
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${id}`);
    revalidatePath(`/clientes/${id}/editar`);
    return { ok: true, id };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

/** 409 si el cliente tiene equipos registrados — el mensaje del backend llega tal cual. */
export async function deleteClientAction(id: string): Promise<ClientActionResult> {
  try {
    await deleteClient(id);
    revalidatePath("/clientes");
    return { ok: true };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}
