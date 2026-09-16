import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

@Injectable()
export class AdminStrategy extends PassportStrategy(Strategy, 'admin') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('ADMIN_SECRET'),
    });

    // console.log('Admin Secret:', config.get('ADMIN_SECRET')); // Debugging
  }

  async validate(payload: any) {
    // console.log('payload iss', payload);

    // if (!payload ) {
    if (!payload || !['super admin', 'admin', 'tutor'].includes(payload.role) ) {
      console.log(!payload , payload.role !== 'admin');
      // throw new UnauthorizedException('Invalid admin token');
      return null;
    }
    // console.log('payload iss before return ', payload);

    return { userId: payload.sub, role: payload.role };
  }
}
