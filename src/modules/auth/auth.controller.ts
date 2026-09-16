import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthDto, LoginDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { User } from '../user/schema/user.schema';
import { errorResponseBuilder, responseBuilder } from 'src/utils/customErrorBuilder';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from '../user/user.service';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'signup' })
  async signUp(@Body() dto: AuthDto) {
    dto.createdAt = new Date();
    dto.updatedAt = new Date();
    const { data, err } = await this.authService.signUp(dto);
    if (err) {
      throw new HttpException('Email is already in use', HttpStatus.CONFLICT);
    }
    return responseBuilder(true, data);
  }

  // api to login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'login' })
  async login(@Body() dto: LoginDto) {
    const {data,err }= await this.authService.signIn(dto);
    if(err){
      console.log(err);

      errorResponseBuilder(err)
    }
    return responseBuilder(true, data);
  }

  // api to admin login

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: LoginDto) {
    const data = await this.authService.adminLogin(dto);

    return responseBuilder(true, data);
  }

  // api to generate otp

  @Patch('forgot-password/:email')
  @HttpCode(HttpStatus.OK)
  async loginWithOtp(
    @Param('email') email: string,
    @Body() updateData: Partial<User>,
  ): Promise<void> {
    return this.authService.generateOtp(email, updateData);
  }

  // api to verify otp
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body('email') email: string,
    @Body('otp') otp: string,
  ): Promise<string> {
    await this.authService.verifyOtp(email, otp);
    return 'OTP verified successfully';
  }

  // api to reset password
  @Patch('reset-password/:email')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Param('email') email: string, @Body('password') password: string) {
    const data = this.authService.resetPassword(email, password);
    return data;
  }
  // api to get a user
  @Get('user')
  @UseGuards(AuthGuard('user'))
  @HttpCode(HttpStatus.OK)
  async currentUser(@getUser() user) {
    const { data, err } = await this.userService.findUserById(user.userId);
    if (err) {
      responseBuilder(false, err);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return responseBuilder(true, data);
  }
}
