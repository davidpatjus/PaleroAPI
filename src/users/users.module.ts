import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ClientProfilesService } from './client-profiles.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, ClientProfilesService],
  exports: [UsersService],
})
export class UsersModule {}
