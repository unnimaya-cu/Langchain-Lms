import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UserStrategy } from './strategy/user.strategy';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { MiscService } from '../misc/misc.service';
import { UserModule } from '../user/user.module';
import { AdminStrategy } from './strategy/admin.strategy';

@Module({
  imports: [MongodbModule, JwtModule.register({}), UserModule],
  controllers: [],
  providers: [
    AuthService,
    JwtService,
    UserStrategy,
    ConfigService,
    EmailService,
    MiscService,
    AdminStrategy,
  ],
  exports: [],
})
export class AuthModule {}
