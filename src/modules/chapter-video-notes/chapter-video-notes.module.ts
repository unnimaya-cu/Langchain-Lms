import { Module } from '@nestjs/common';
import { ChapterVideoNotesController } from './chapter-video-notes.controller';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';
import { ChapterVideoNotesService } from './chapter-video-notes.service';

@Module({
  imports:[MongodbModule],
  providers:[ChapterVideoNotesService],
  controllers: [ChapterVideoNotesController]
})
export class ChapterVideoNotesModule {}
