import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';

@Module({
  imports:[MongodbModule],
  controllers: [RoleController],
  providers:[RoleService]
})
export class RoleModule {}
