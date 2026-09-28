import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  AssistedDraftingService,
  AssistedDraftResult,
  AssistedDraftStatusView,
} from './assisted-drafting.service';
import { GenerateDraftDto } from './dto/generate-draft.dto';

/**
 * Una acción concreta sobre una orden — no una conversación: cada
 * generación es independiente, sin historial de mensajes.
 */
@Controller()
export class AssistedDraftingController {
  constructor(
    private readonly assistedDraftingService: AssistedDraftingService,
  ) {}

  /** GET /assisted-drafting/status — disponibilidad y cuota del mes de la empresa. */
  @Roles(Role.ADMIN, Role.COORDINATOR, Role.TECHNICIAN)
  @Get('assisted-drafting/status')
  status(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssistedDraftStatusView> {
    return this.assistedDraftingService.getStatus(user);
  }

  /**
   * POST /work-orders/:id/assisted-draft — devuelve un BORRADOR; nunca
   * escribe en la orden.
   */
  @Roles(Role.ADMIN, Role.COORDINATOR, Role.TECHNICIAN)
  @Post('work-orders/:id/assisted-draft')
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateDraftDto,
  ): Promise<AssistedDraftResult> {
    return this.assistedDraftingService.generate(user, id, dto.notes);
  }
}
