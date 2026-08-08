import { Module } from '@nestjs/common';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WorkOrderPaymentsController } from './work-order-payments.controller';

@Module({
  imports: [WorkOrdersModule],
  controllers: [WorkOrderPaymentsController, PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
