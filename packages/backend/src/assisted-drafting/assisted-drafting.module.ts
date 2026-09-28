import { Module } from '@nestjs/common';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { AnthropicDraftingProvider } from './anthropic-drafting.provider';
import { AssistedDraftingController } from './assisted-drafting.controller';
import { AssistedDraftingService } from './assisted-drafting.service';
import { DRAFTING_PROVIDER, DraftingProvider } from './drafting-provider';
import { DraftingTemplatesService } from './drafting-templates.service';

/**
 * ASSIST_PROVIDER elige la implementación (hoy solo "anthropic"). Un valor
 * desconocido no cae a otro proveedor en silencio: deja la función
 * deshabilitada con el motivo en los logs de arranque.
 */
function createProvider(): DraftingProvider {
  const name = process.env.ASSIST_PROVIDER?.trim() || 'anthropic';
  if (name === 'anthropic') return new AnthropicDraftingProvider();

  return {
    name,
    model: process.env.ASSIST_MODEL?.trim() || 'desconocido',
    configurationProblem: () =>
      `ASSIST_PROVIDER="${name}" no es un proveedor soportado`,
    generate: () =>
      Promise.reject(new Error(`Proveedor no soportado: ${name}`)),
  };
}

@Module({
  imports: [WorkOrdersModule],
  controllers: [AssistedDraftingController],
  providers: [
    AssistedDraftingService,
    DraftingTemplatesService,
    { provide: DRAFTING_PROVIDER, useFactory: createProvider },
  ],
})
export class AssistedDraftingModule {}
