import { Module } from '@nestjs/common';
import { ChapterVideoService } from './chapter-video.service';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';

@Module({
  imports: [MongodbModule],
  providers: [ChapterVideoService],
  exports: [ChapterVideoService],
})
export class ChapterVideoModule {}
