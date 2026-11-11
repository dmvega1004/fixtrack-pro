import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { EquipmentsModule } from '../equipments/equipments.module';
import { EquipmentPhotosController } from './equipment-photos.controller';
import { EquipmentPhotosService } from './equipment-photos.service';

@Module({
  imports: [EquipmentsModule, CloudinaryModule],
  controllers: [EquipmentPhotosController],
  providers: [EquipmentPhotosService],
})
export class EquipmentPhotosModule {}
