"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { toFriendlyActionMessage } from "@/lib/api/http";
import type { Client, DocumentType } from "@/lib/api/clients";
import type { Equipment } from "@/lib/api/equipments";
import type { Priority } from "@/components/shared/priority-badge";
import type { ServiceType } from "@/components/shared/service-type-badge";

interface NewClientData {
  name: string;
  documentType?: DocumentType;
  documentNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface NewEquipmentData {
  brand: string;
  model: string;
  serialNumber?: string;
  location?: string;
}

export type ClientSelection =
  | { mode: "existing"; id: string }
  | { mode: "new"; data: NewClientData };

/**
 * "none" = servicio locativo sin equipo asociado (sellado, limpieza,
 * instalación de vitrinas, etc.) — la orden se crea solo con clientId.
 * "selection" = 0+ equipos ya existentes (existingIds) + 0+ equipos nuevos
 * creados en línea (newEquipment, colgados del cliente resultante) — una
 * orden puede abarcar varios equipos del mismo cliente (ej. un proyecto de
 * adecuación normativa sobre 5 portones cotizado como una sola OT).
 */
export type EquipmentSelection =
  | { mode: "none" }
  | { mode: "selection"; existingIds: string[]; newEquipment: NewEquipmentData[] };

export interface CreateOrderInput {
  client: ClientSelection;
  equipment: EquipmentSelection;
  description: string;
  priority: Priority;
  /** Opcional: si se omite, el backend aplica el default CORRECTIVE. */
  serviceType?: ServiceType;
  userId?: string;
}

export interface CreateOrderResult {
  ok: boolean;
  message?: string;
  orderId?: string;
  orderNumber?: number;
}

interface CreatedWorkOrder {
  id: string;
  orderNumber: number;
}

/**
 * Server Action que encadena las creaciones necesarias para dejar una orden
 * lista: cliente (si es nuevo) → equipo (si es nuevo, colgado del cliente
 * resultante) → orden. Cada paso ya trae su propio candado multi-tenant y
 * validación cruzada en el backend; acá solo se propaga el id resultante
 * de un paso al siguiente.
 */
export async function createWorkOrderChainedAction(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  try {
    let clientId: string;
    if (input.client.mode === "existing") {
      clientId = input.client.id;
    } else {
      const client = await serverFetch<Client>("/clients", {
        method: "POST",
        body: input.client.data,
      });
      clientId = client.id;
    }

    // mode "none": servicio locativo, equipmentIds queda vacío.
    const equipmentIds: string[] = [];
    if (input.equipment.mode === "selection") {
      equipmentIds.push(...input.equipment.existingIds);
      // Los equipos nuevos se crean colgados del cliente YA resuelto arriba
      // (nuevo o existente) — uno por uno, para poder recuperar cada id.
      for (const data of input.equipment.newEquipment) {
        const equipment = await serverFetch<Equipment>("/equipments", {
          method: "POST",
          body: { ...data, clientId },
        });
        equipmentIds.push(equipment.id);
      }
    }

    const order = await serverFetch<CreatedWorkOrder>("/work-orders", {
      method: "POST",
      body: {
        description: input.description,
        priority: input.priority,
        clientId,
        ...(equipmentIds.length > 0 ? { equipmentIds } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.serviceType ? { serviceType: input.serviceType } : {}),
      },
    });

    revalidatePath("/ordenes");
    return { ok: true, orderId: order.id, orderNumber: order.orderNumber };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}
