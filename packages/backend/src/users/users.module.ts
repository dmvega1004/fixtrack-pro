import { Module } from '@nestjs/common';
import { AuthUserCacheModule } from '../auth/auth-user-cache';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [CloudinaryModule, AuthUserCacheModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
