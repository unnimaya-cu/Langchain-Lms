import { forwardRef, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';
import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notifications.controller';
import { UserModule } from '../user/user.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [MongodbModule ,forwardRef(() => UserModule)],
  providers: [
    NotificationService,
    NotificationGateway,
    JwtService
  ],
  controllers: [NotificationController],
  exports:[NotificationGateway, NotificationService]
})
export class NotificationModule {}
