import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { WorkOrderSignaturesController } from './work-order-signatures.controller';
import { WorkOrderSignaturesService } from './work-order-signatures.service';

@Module({
  imports: [WorkOrdersModule, ActivityModule, CloudinaryModule],
  controllers: [WorkOrderSignaturesController],
  providers: [WorkOrderSignaturesService],
})
export class WorkOrderSignaturesModule {}
