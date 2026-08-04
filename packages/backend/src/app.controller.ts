import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Health check público: no requiere token. */
  @Public()
  @Get()
  async getHello(): Promise<string> {
    return this.appService.getHello();
  }

  /**
   * Health check para Railway y monitores externos: siempre 200 si el
   * proceso está vivo, sin tocar la base de datos ni requerir token.
   */
  @Public()
  @Get('health')
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
