import { Module } from '@nestjs/common';
import { SubscribeController } from './subscribe.controller';
import { SubscribeService } from './subscribe.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscribe, SubscribeSchema } from './schema/subscribe.schema';

@Module({
  imports:[MongooseModule.forFeature([{ name:Subscribe.name, schema:SubscribeSchema} ] )],
  controllers: [SubscribeController],
  providers:[SubscribeService]
})
export class SubscribeModule {}
