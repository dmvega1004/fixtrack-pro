"use server";

import { revalidatePath } from "next/cache";
import { HttpError } from "@/lib/api/http";
import { createClient, type CreateClientInput, type Client } from "@/lib/api/clients";
import {
  createQuote,
  updateQuote,
  sendQuote,
  decideQuote,
  duplicateQuote,
  deleteQuote,
  postponeFollowUp,
  type CreateQuoteInput,
  type UpdateQuoteInput,
  type DecideQuoteInput,
} from "@/lib/api/quotes";

export interface QuoteActionResult {
  ok: boolean;
  message?: string;
  id?: string;
}

export type QuoteClientSelection =
  | { mode: "existing"; id: string }
  | { mode: "new"; data: CreateClientInput };

export interface CreateQuoteFormInput extends Omit<CreateQuoteInput, "clientId"> {
  client: QuoteClientSelection;
}

/**
 * Server Action que encadena cliente (si es nuevo) → cotización, mismo
 * patrón que createWorkOrderChainedAction. El cliente ya viene con su
 * propio candado multi-tenant en el backend; acá solo se propaga el id
 * resultante al payload de la cotización.
 */
export async function createQuoteAction(input: CreateQuoteFormInput): Promise<QuoteActionResult> {
  try {
    let clientId: string;
    if (input.client.mode === "existing") {
      clientId = input.client.id;
    } else {
      const client: Client = await createClient(input.client.data);
      clientId = client.id;
    }

    const { client: _client, ...rest } = input;
    const quote = await createQuote({ ...rest, clientId });

    revalidatePath("/cotizaciones");
    return { ok: true, id: quote.id };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

export async function updateQuoteAction(
  id: string,
  dto: UpdateQuoteInput,
): Promise<QuoteActionResult> {
  try {
    await updateQuote(id, dto);
    revalidatePath("/cotizaciones");
    revalidatePath(`/cotizaciones/${id}`);
    revalidatePath(`/cotizaciones/${id}/editar`);
    return { ok: true, id };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

/** POST /quotes/:id/send — asigna el consecutivo y congela los valores. */
export async function sendQuoteAction(id: string): Promise<QuoteActionResult> {
  try {
    await sendQuote(id);
    revalidatePath("/cotizaciones");
    revalidatePath(`/cotizaciones/${id}`);
    return { ok: true, id };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

export async function decideQuoteAction(
  id: string,
  dto: DecideQuoteInput,
): Promise<QuoteActionResult> {
  try {
    await decideQuote(id, dto);
    revalidatePath("/cotizaciones");
    revalidatePath(`/cotizaciones/${id}`);
    return { ok: true, id };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

/** POST /quotes/:id/duplicate — devuelve el id del borrador nuevo para navegar allá. */
export async function duplicateQuoteAction(id: string): Promise<QuoteActionResult> {
  try {
    const duplicated = await duplicateQuote(id);
    revalidatePath("/cotizaciones");
    return { ok: true, id: duplicated.id };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

/** POST /quotes/:id/postpone-follow-up — recalcula followUpAt = hoy + days. Solo SENT. */
export async function postponeFollowUpAction(id: string, days: number): Promise<QuoteActionResult> {
  try {
    await postponeFollowUp(id, days);
    revalidatePath("/cotizaciones");
    revalidatePath(`/cotizaciones/${id}`);
    return { ok: true, id };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

/** DELETE /quotes/:id — solo DRAFT (409 del backend si no lo está). */
export async function deleteQuoteAction(id: string): Promise<QuoteActionResult> {
  try {
    await deleteQuote(id);
    revalidatePath("/cotizaciones");
    return { ok: true };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}
