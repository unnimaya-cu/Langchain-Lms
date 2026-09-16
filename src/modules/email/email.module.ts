import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports:[ConfigModule],
  providers: [EmailService,ConfigService],
  controllers: [EmailController],
  exports:[EmailModule]
})
export class EmailModule {}
