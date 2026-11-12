import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { EquipmentsModule } from '../equipments/equipments.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { EquipmentPhotosController } from './equipment-photos.controller';
import { EquipmentPhotosService } from './equipment-photos.service';

@Module({
  imports: [EquipmentsModule, CloudinaryModule, WorkOrdersModule],
  controllers: [EquipmentPhotosController],
  providers: [EquipmentPhotosService],
})
export class EquipmentPhotosModule {}
