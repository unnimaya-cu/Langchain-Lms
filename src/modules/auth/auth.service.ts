import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthDto, LoginDto } from './dto/auth.dto';
import * as argon from 'argon2';
import { Model } from 'mongoose';

import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/schema/user.schema';
import { EmailService } from '../email/email.service';
import { MiscService } from '../misc/misc.service';
import { ModelNames } from 'src/common/enum/model-names.enum';
import { StatusType } from 'src/common/enum/status-type.enum';


@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
    private emailService: EmailService,
    private miscService: MiscService,
  ) { }
  async signUp(dto: AuthDto) {
    try {
      dto.password = await argon.hash(dto.password);
      const userCode = await this.miscService.getNextSequence(ModelNames.USER);
      const userData = await new this.userModel({ ...dto, userCode }).save();
      // console.log('userdatata', userData);
      return { data: { email: userData.email }, err: null };
    } catch (error) {
      console.log(error);
      return { data: null, err: error };
    }
  }

  // login
  async signIn(dto: LoginDto) {
    try {
      const user = await this.userModel.findOne({
        email: { $regex: `^${dto.email}$`, $options: 'i' },
        status: StatusType.ACTIVE,
      });

      if (!user) throw new UnauthorizedException('credentials incorrect');
      const passwordMatches = await argon.verify(user.password, dto.password);
      if (!passwordMatches) {
        throw new UnauthorizedException('credentials incorrect');
      } else {
        await this.userModel.updateOne(
          { _id: user._id },
          { $set: { lastLogin: new Date() } }
        )
      }
      // const jwtSecret = 'JWT_SECRET';
      const jwtSecret = this.config.get('JWT_SECRET');
      const token = await this.signToken(user.id, jwtSecret);
      return {
        data: {
          token: token.accesstoken,
          firstname: user.firstName,
          email: user.email,
          // userId :user.id
        }, err: null
      };
    } catch (error) {
      console.log(error);
      return { data: null, err: error }
      // throw error instanceof UnauthorizedException
      //   ? error
      //   : new InternalServerErrorException('An error occurred during sign-in');
    }
  }

  // admin login

  async adminLogin(dto: LoginDto) {
    try {
      const user = await this.userModel
        .findOne({ email: { $regex: `^${dto.email}$`, $options: 'i' } })
        .populate('roleId');
      if (!user) throw new UnauthorizedException('Credentials incorrect.');
      const passwordMatches = await argon.verify(user.password, dto.password);
      if (!passwordMatches)
        throw new UnauthorizedException('Credentials incorrect.');

      // Check if roleId exists
      if (!user.roleId) {
        throw new UnauthorizedException('User role is required. Please contact administrator.');
      }

      // Extract role name from populated roleId
      const roleName = typeof user.roleId === 'object' 
        ? (user.roleId as any).roleName 
        : null;

      // Check if roleName exists and is not empty
      if (!roleName || roleName.trim() === '') {
        throw new UnauthorizedException('User role is required. Please contact administrator.');
      }

      // console.log('roleName', roleName);

        if (roleName.toLowerCase() === 'user') {
          throw new UnauthorizedException('Unautorized access.');
        }

      const adminJwtSecret = this.config.get('ADMIN_SECRET');
      const adminToken = await this.signToken(user.id, adminJwtSecret, roleName);
      return {
        token: adminToken.accesstoken,
        roleName: roleName, // Optionally return role name in response
      };
    } catch (error) {
      console.log(error);
      throw error instanceof UnauthorizedException
        ? error
        : new InternalServerErrorException('An error occurred during sign-in');
    }
  }

  async signToken(
    userId: string,
    secretkey: string,
    roleId?: string,
  ): Promise<{ accesstoken: string }> {
    const payload = {
      sub: userId,
      role: roleId,
    };
    // console.log('payload', payload);

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '1d',
      secret: secretkey,
    });
    // console.log('token', token);

    return {
      accesstoken: token,
    };
  }

  async generateOtp(email: string, updateData: Partial<User>): Promise<void> {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      // console.log('otp is', otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      console.log('expired', expiresAt);
      const updateUserData = await this.userModel
        .findOneAndUpdate(
          { email },
          { $set: { ...updateData, otp, expiresAt } },
          { new: true },
        )
        .exec();

      if (!updateUserData) {
        throw new NotFoundException(`User with email ${email} not found`);
      }
      // console.log('Updated UserData:', updateUserData);
      await EmailService.sendOtpEmail(email, otp);
      console.log(`OTP email sent successfully to: ${email}`);
      // await createOtpEmail(email, otp);
      //console.log('OTP email sent successfully to:', email);
    } catch (error) {
      console.error('Error in generateOtp:', error);
      throw error;
    }
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    try {
      const data = await this.userModel.findOne({ email, otp });
      if (!data) {
        throw new BadRequestException('Invalid OTP');
      }
      if (data.expiresAt < new Date()) {
        throw new BadRequestException('OTP has expired');
      }
      await this.userModel.updateOne(
        { email },
        {
          $unset: { otp: "", expiresAt: "" },
          $set: { isVerified: true },
        }
      );
      return true;
    } catch (error) {
      console.log('error', error);
      throw error
    }
  }

  async resetPassword(
    email: string,
    password: string,
    // updateData: Partial<User>,
  ) {
    try {
      // const convertpassword = password.toString();
      // console.log("passwrd",convertpassword);
      const hashedPassword = await argon.hash(password);

      const data = await this.userModel
        .findOneAndUpdate(
          { email },
          { $set: { password: hashedPassword } },
          { new: true },
        )
        .exec();

      // console.log("redata",data);

      if (!data) {
        throw new NotFoundException(`User with email ${email} not found`);
      }
      return data;
    } catch (error) {
      console.log(error);
      throw error
    }
  }

  async validateUser(id: string) {
    try {
      const user = this.userModel.findOne({
        userId: id,
      });
      if (!user) {
        return new HttpException('invalid token', HttpStatus.UNAUTHORIZED);
      }
      return user;
    } catch (error) {
      console.log(error);
    }
  }
}
