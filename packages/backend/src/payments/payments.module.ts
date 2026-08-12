import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WorkOrderPaymentsController } from './work-order-payments.controller';

@Module({
  imports: [WorkOrdersModule, ActivityModule],
  controllers: [WorkOrderPaymentsController, PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
