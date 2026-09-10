import { Module } from '@nestjs/common';
import { EquipmentsModule } from '../equipments/equipments.module';
import { SupabaseStorageModule } from '../supabase/supabase-storage.module';
import { EquipmentFilesController } from './equipment-files.controller';
import { EquipmentFilesService } from './equipment-files.service';

@Module({
  imports: [EquipmentsModule, SupabaseStorageModule],
  controllers: [EquipmentFilesController],
  providers: [EquipmentFilesService],
})
export class EquipmentFilesModule {}
