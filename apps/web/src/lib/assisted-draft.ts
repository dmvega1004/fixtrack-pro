/**
 * Marca que deja la redacción asistida donde falta información — debe
 * reflejar exactamente MISSING_INFO_MARKER de
 * packages/backend/src/assisted-drafting/drafting-prompt.ts.
 */
export const MISSING_INFO_MARKER = "[FALTA:";

const MARKER_PATTERN = /\[FALTA:[^\]\n]*\]?/g;

/** Cada marca [FALTA: …] que queda en el texto, tal cual aparece. */
export function findMissingInfoMarkers(text: string): string[] {
  return text.includes(MISSING_INFO_MARKER) ? (text.match(MARKER_PATTERN) ?? []) : [];
}

/** Campos que la redacción asistida puede escribir. */
export type AssistedTextField = "diagnosis" | "observations" | "suggestions";

export const ASSISTED_FIELD_LABELS: Record<AssistedTextField, string> = {
  diagnosis: "Diagnóstico",
  observations: "Observaciones",
  suggestions: "Sugerencias y recomendaciones",
};

// Deben reflejar AssistedDraftStatusView/AssistedDraftResult de
// packages/backend/src/assisted-drafting/assisted-drafting.service.ts
export interface AssistedDraftQuota {
  available: boolean;
  limit: number;
  used: number;
  remaining: number;
}

export interface AssistedDraft {
  diagnosis: string;
  observations: string;
  suggestions: string;
  missingInfo: string[];
}

export type AssistedDraftResult =
  | { outcome: "OK"; draft: AssistedDraft; usageId: string; quota: AssistedDraftQuota }
  | { outcome: "QUOTA_EXHAUSTED"; quota: AssistedDraftQuota }
  | { outcome: "UNAVAILABLE" }
  | { outcome: "PROVIDER_ERROR" };
