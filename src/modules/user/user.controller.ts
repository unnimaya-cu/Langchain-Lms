import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserDocument } from './schema/user.schema';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { UpdatePasswordDto, UpdateUserDto, UserDto } from './dto/user.dto';
import { AuthGuard } from '@nestjs/passport';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
// import { getUser } from 'src/common/decorators/userdecorator/user.decorator';

@UseGuards(AuthGuard(['admin', 'user']))
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() dto: UserDto) {
    // dto.createdAt = new Date();
    // dto.createdBy = '';
    // dto.updatedAt = new Date();
    // dto.updatedBy = '';

    const { data, err } = await this.userService.createUser(dto);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Get('admin')
  async getAdminAndRole(@getUser() user) {
    // console.log('admin route for side panel', user);

    const { data, err } = await this.userService.findAdminAndRole(user.userId);

    if (err) {
      errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  // @UseGuards(AuthGuard('admin'))
  @Get('allusers')
  @HttpCode(HttpStatus.OK)
  async getAllUsersByAdmin(
    @Query('startIndex', ParseIntPipe) startIndex: string,
    @Query('noOfItems', ParseIntPipe) noOfItems: string,
    @Query('search') search: string,
    @Query('status') status?: string,
  ) {
    const { data, err } = await this.userService.getAllUsers(
      startIndex,
      noOfItems,
      search,
      status
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
  @UseGuards(AuthGuard('admin'))
  @Get('chart')
  @HttpCode(HttpStatus.OK)
  async getUserJoinStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const { data, err } = await this.userService.getMonthlySignUpUsers(
      startDate,
      endDate,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('daily-chart')
  @HttpCode(HttpStatus.OK)
  async getUserJoinDailyStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const { data, err } = await this.userService.getDailySignupUsers(
      startDate,
      endDate,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Body() dto: UpdateUserDto,
    @Param('id') id: string,
    // @UploadedFile() file: Express.Multer.File,
  ): Promise<{ data: UserDocument }> {
    // console.log('update filee', file);

    try {
      dto.updatedAt = new Date();
      dto.updatedBy = null;
      // dto.profileImg = file.path;
      const updatedUser = await this.userService.updateUser(id, dto);

      if (!updatedUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return { data: updatedUser };
    } catch (error) {
      console.error('Error during user update:', error);

      // Handle specific errors or rethrow for global handling
      throw new HttpException(
        error.message || 'An unexpected error occurred',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('adminlist')
  @HttpCode(HttpStatus.OK)
  async getAllAdminsByAdmin(
    @Query('startIndex', ParseIntPipe) startIndex: number,
    @Query('noOfItems', ParseIntPipe) noOfItems: number,
    @Query('search') search: string,
    @Query('status') status?: string,
    @Query('privilege') privilege?: string,
  ) {
    // console.log('all admin', startIndex, noOfItems, search);

    const { data, err } = await this.userService.getAllAdmins(
      startIndex,
      noOfItems,
      search,
      status,
      privilege
    );
    if (err) {
      return errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const { data, err } = await this.userService.findUserById(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);

    // if (!user) {
    //   throw new NotFoundException(`User with ID ${id} not found`);
    // }
    // return user;
    // } catch (error) {
    //   if (error instanceof NotFoundException) {
    //     throw error;
    //   }
    //   console.error(`Error retrieving user with ID: ${id}`, error);
    //   throw new InternalServerErrorException('An error occurred while fetching the user');
    // }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string) {
    const { data, err } = await this.userService.deleteUser(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch('/status/:id')
  @HttpCode(HttpStatus.OK)
  async userStatusChange(@Param('id') id: string) {
    const { data, err } = await this.userService.userStatusChange(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Post('register/admin')
  @HttpCode(HttpStatus.CREATED)
  async createAdmin(@Body() dto: UserDto) {
    // dto.createdAt = new Date();
    // dto.createdBy = '';
    // dto.updatedAt = new Date();
    // dto.updatedBy = '';

    const { data, err } = await this.userService.createAdmin(dto);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch('/admin/password-change')
  @HttpCode(HttpStatus.CREATED)
  async changePasswordAdmin(@Body() dto: UpdatePasswordDto, @getUser() user) {
    const { data, err } = await this.userService.changePassword(
      dto,
      user.userId,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Patch('change/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() dto: UpdatePasswordDto, @getUser() user) {
    console.log('User data:', user.userId);
    const { data, err } = await this.userService.changePassword(
      dto,
      user.userId,
    );
    if (err) {
      // console.log("nnbnmm",err?.response?.error?.message);
      errorResponseBuilder(err?.response?.error?.message);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Get('/admin/user/profile')
  async getUserProfile() {
    const { data, err } = await this.userService.findUserById('');
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  async getUserForAdmin(@Param('id') id: string) {
    const { data, err } = await this.userService.findUserById(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  async getUserAdminForAdmin(@Param('id') id: string) {
    const { data, err } = await this.userService.findUserById(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('admin/usersrolepermission/:id')
  @HttpCode(HttpStatus.OK)
  async getUserRolePermission(@Param('id') id: string) {
    const { data, err } = await this.userService.getUserRolesAndPermissions(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}
