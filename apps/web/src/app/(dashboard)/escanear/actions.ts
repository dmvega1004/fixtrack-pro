"use server";

import { HttpError, toFriendlyActionMessage } from "@/lib/api/http";
import { getEquipmentByQrCode } from "@/lib/api/equipments";

export interface ResolveQrCodeResult {
  ok: boolean;
  message?: string;
  equipmentId?: string;
  brand?: string;
  model?: string;
}

export async function resolveQrCodeAction(
  qrCode: string,
): Promise<ResolveQrCodeResult> {
  try {
    const equipment = await getEquipmentByQrCode(qrCode);
    return {
      ok: true,
      equipmentId: equipment.id,
      brand: equipment.brand,
      model: equipment.model,
    };
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 400)) {
      return {
        ok: false,
        message: "Este código no corresponde a ningún equipo de tu empresa",
      };
    }
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}
