import { DraftingUsage } from './drafting-provider';

interface ModelPrice {
  /** USD por millón de tokens de entrada. */
  input: number;
  /** USD por millón de tokens de salida. */
  output: number;
}

/**
 * Precios de lista conocidos (USD / millón de tokens) al momento de
 * escribir esto. Son solo el respaldo: ASSIST_PRICE_INPUT_PER_MTOK y
 * ASSIST_PRICE_OUTPUT_PER_MTOK mandan sobre esta tabla, para poder
 * corregir un precio sin desplegar código.
 */
const KNOWN_PRICES: Record<string, ModelPrice> = {
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

/** Multiplicadores del caché de prompts de Anthropic sobre el precio de entrada. */
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

function envNumber(name: string): number | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function priceFor(model: string): ModelPrice | null {
  const input = envNumber('ASSIST_PRICE_INPUT_PER_MTOK');
  const output = envNumber('ASSIST_PRICE_OUTPUT_PER_MTOK');
  if (input !== null && output !== null) return { input, output };
  return KNOWN_PRICES[model] ?? null;
}

/**
 * Costo estimado en USD. 0 si el modelo no tiene precio conocido ni
 * configurado — los tokens se guardan igual, así que se puede recalcular.
 */
export function estimateCostUsd(model: string, usage: DraftingUsage): number {
  const price = priceFor(model);
  if (!price) return 0;
  const perToken = (perMillion: number) => perMillion / 1_000_000;
  return (
    usage.inputTokens * perToken(price.input) +
    usage.cacheWriteTokens * perToken(price.input) * CACHE_WRITE_MULTIPLIER +
    usage.cacheReadTokens * perToken(price.input) * CACHE_READ_MULTIPLIER +
    usage.outputTokens * perToken(price.output)
  );
}
