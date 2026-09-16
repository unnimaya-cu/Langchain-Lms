import { Module } from '@nestjs/common';
import { AdmindashboardController } from './admindashboard.controller';
import { AdmindashboardService } from './admindashboard.service';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';

@Module({
  imports: [MongodbModule],
  controllers: [AdmindashboardController],
  providers: [AdmindashboardService],
})
export class AdmindashboardModule {}
