import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { WorkOrderPartsController } from './work-order-parts.controller';
import { WorkOrderPartsService } from './work-order-parts.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  imports: [CloudinaryModule, ActivityModule],
  controllers: [WorkOrdersController, WorkOrderPartsController],
  providers: [WorkOrdersService, WorkOrderPartsService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
