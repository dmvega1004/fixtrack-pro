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
}
