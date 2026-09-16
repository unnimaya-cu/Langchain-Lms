import { Module } from '@nestjs/common';
import { MiscService } from './misc.service';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';

@Module({
  imports: [MongodbModule],
  providers: [MiscService],
  controllers: [],
  exports:[MiscService]
})
export class MiscModule {}
