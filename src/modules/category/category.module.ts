import { Module } from '@nestjs/common';
import { CategoriesController } from './category.controller';
import { CategoriesService } from './category.service';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';
import { MiscModule } from '../misc/misc.module';

@Module({
  imports: [MongodbModule, MiscModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoryModule {}
