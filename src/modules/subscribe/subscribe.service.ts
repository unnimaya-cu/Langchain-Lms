import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Subscribe } from './schema/subscribe.schema';
import { Model } from 'mongoose';
import { CreateSubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class SubscribeService {
  constructor(
    @InjectModel(Subscribe.name)
    private readonly subscribeModel: Model<Subscribe>,
  ) {}

  async subscribe(dto: CreateSubscribeDto) {
    try {
      // const exists = await this.subscribeModel.findOne({
      //   email: dto.email,
      // });

      // if (exists) {
      //   throw new ConflictException('Email already subscribed');
      // }

      const subscriber = await this.subscribeModel.create(dto);
      return { data: subscriber, err: null };
      // return {
      //   message: 'Subscribed successfully',
      //   email: subscriber.email,
      // };
    } catch (err) {
      return { data: null, err };
    }
  }

  async getAllSubscribers(){
    try {
      const allSubscribers= await this.subscribeModel.find()
      return {data :allSubscribers,err:null }
    } catch (err) {
      return { data: null, err };
    }
  }
}
