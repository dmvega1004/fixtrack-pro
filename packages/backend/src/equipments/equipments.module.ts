import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { SupabaseStorageModule } from '../supabase/supabase-storage.module';
import { EquipmentsController } from './equipments.controller';
import { EquipmentsService } from './equipments.service';

@Module({
  imports: [SupabaseStorageModule, CloudinaryModule],
  controllers: [EquipmentsController],
  providers: [EquipmentsService],
  exports: [EquipmentsService],
})
export class EquipmentsModule {}
