import { Module } from '@nestjs/common';
import { WorkOrderPartsController } from './work-order-parts.controller';
import { WorkOrderPartsService } from './work-order-parts.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  controllers: [WorkOrdersController, WorkOrderPartsController],
  providers: [WorkOrdersService, WorkOrderPartsService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
