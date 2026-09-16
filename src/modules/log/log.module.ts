import { Module } from '@nestjs/common';
import { LogService } from './log.service';
import { LogController } from './log.controller';
import { Model } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { Log, LogSchema } from "./log.schema"

@Module({
  imports: [MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]),],
  controllers: [LogController],
  providers: [LogService,],
})
export class LogModule {}
