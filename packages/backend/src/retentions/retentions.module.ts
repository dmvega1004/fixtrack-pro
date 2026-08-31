import { Module } from '@nestjs/common';
import { RetentionsController } from './retentions.controller';
import { RetentionsService } from './retentions.service';

@Module({
  controllers: [RetentionsController],
  providers: [RetentionsService],
})
export class RetentionsModule {}
