import Anthropic from '@anthropic-ai/sdk';
import {
  DraftingProvider,
  DraftingProviderError,
  DraftingRequest,
  DraftingResponse,
  DraftingUsage,
} from './drafting-provider';

/**
 * Sonnet por defecto: la tarea es aplicar plantillas explícitas a apuntes
 * dados, y la regla de no inventar la imponen las plantillas y la revisión
 * del técnico — no el tamaño del modelo. Cambiable con ASSIST_MODEL.
 */
const DEFAULT_MODEL = 'claude-sonnet-5';
const DEFAULT_EFFORT = 'medium';
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type Effort = (typeof EFFORTS)[number];

/** Incluye el razonamiento interno del modelo; la redacción final ronda 1–2K. */
const MAX_TOKENS = 12_000;
const REQUEST_TIMEOUT_MS = 90_000;

function usageOf(message: Anthropic.Message): DraftingUsage {
  return {
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
  };
}

/**
 * Proveedor Anthropic vía SDK oficial. La llave (ANTHROPIC_API_KEY) vive
 * solo en las variables del backend en Railway — nunca llega al navegador:
 * el frontend solo habla con este backend.
 *
 * Cliente PEREZOSO, mismo criterio que SupabaseStorageService: sin llave el
 * servidor arranca igual y la función queda deshabilitada con su motivo.
 */
export class AnthropicDraftingProvider implements DraftingProvider {
  readonly name = 'anthropic';
  readonly model = process.env.ASSIST_MODEL?.trim() || DEFAULT_MODEL;
  private client: Anthropic | null = null;

  configurationProblem(): string | null {
    return process.env.ANTHROPIC_API_KEY?.trim()
      ? null
      : 'ANTHROPIC_API_KEY no está configurada';
  }

  private effort(): Effort {
    const raw = process.env.ASSIST_EFFORT?.trim() as Effort | undefined;
    return raw && EFFORTS.includes(raw) ? raw : DEFAULT_EFFORT;
  }

  async generate(request: DraftingRequest): Promise<DraftingResponse> {
    this.client ??= new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 1,
    });

    let message: Anthropic.Message;
    try {
      message = await this.client.messages.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        // Las instrucciones (plantillas) son idénticas entre llamadas
        // mientras no se edite el archivo: se cachean para abaratar la
        // entrada. Lo variable (apuntes + orden) va después, en `messages`.
        system: [
          {
            type: 'text',
            text: request.system,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: request.user }],
        output_config: {
          effort: this.effort(),
          format: { type: 'json_schema', schema: request.outputSchema },
        },
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new DraftingProviderError('AUTH', 'Llave del proveedor inválida');
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new DraftingProviderError(
          'RATE_LIMIT',
          'Límite de peticiones del proveedor',
        );
      }
      if (error instanceof Anthropic.BadRequestError) {
        throw new DraftingProviderError('BAD_REQUEST', error.message);
      }
      if (error instanceof Anthropic.APIConnectionTimeoutError) {
        throw new DraftingProviderError(
          'TIMEOUT',
          'El proveedor no respondió a tiempo',
        );
      }
      if (error instanceof Anthropic.APIError) {
        throw new DraftingProviderError(
          `HTTP_${error.status ?? 'UNKNOWN'}`,
          error.message,
        );
      }
      throw new DraftingProviderError(
        'NETWORK',
        error instanceof Error ? error.message : String(error),
      );
    }

    const usage = usageOf(message);

    if (message.stop_reason === 'refusal') {
      throw new DraftingProviderError(
        'REFUSAL',
        'El modelo declinó la solicitud',
        usage,
      );
    }
    if (message.stop_reason === 'max_tokens') {
      throw new DraftingProviderError('TRUNCATED', 'Respuesta truncada', usage);
    }

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    try {
      return { json: JSON.parse(text), usage, model: message.model };
    } catch {
      throw new DraftingProviderError(
        'INVALID_JSON',
        'Respuesta no es JSON válido',
        usage,
      );
    }
  }
}
