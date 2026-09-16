import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class UserStrategy extends PassportStrategy(Strategy, 'user') {
  constructor(
    config: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }
  async validate(payload: any) {
    const user = await this.userService.findUserById(payload.sub);

    if (
      !user ||
      user?.data?.status === 'INACTIVE' ||
      user?.data?.status === 'DELETED'
    ) {
      throw new UnauthorizedException('User not found or has been deleted');
    }

    return { userId: payload.sub };
  }
}
