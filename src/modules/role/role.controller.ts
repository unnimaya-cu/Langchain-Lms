import {
  Body,
  Controller,
  Post,
  HttpStatus,
  Get,
  HttpCode,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleDto } from './dto/role.dto';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('admin'))
@Controller('role')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async createRole(@Body() dto: RoleDto) {
    dto.roleCreatedAt = new Date();
    dto.roleUpdatedAt = new Date();

    console.log('role dto', dto);

    const { data, err } = await this.roleService.createRoleData(dto);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  async getAllRoles() {
    const { data, err } = await this.roleService.getAllRoles();
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Get('admin-roles')
  @HttpCode(HttpStatus.OK)
  async getAllRolesAdmin() {
    const { data, err } = await this.roleService.getAllRolesByAdmin();
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
  @Get('user-role')
  @HttpCode(HttpStatus.OK)
  async getRoleUser() {
    const { data, err } = await this.roleService.getUserRole();
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
  // @Get('allroles')
  // @HttpCode(HttpStatus.OK)
  // async getAllRoles(
  //   @Query('startIndex') startIndex: string,
  //   @Query('noOfItems') noOfItems: string,
  //   @Query('search') search: string
  // ) {
  //   const { data, err } = await this.roleService.getAllRoles( parseInt(startIndex),
  //     parseInt(noOfItems), search);
  //   if (err) {
  //     errorResponseBuilder(err);
  //   }
  //   return responseBuilder(true, data);
  // }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateRole(@Body() dto: RoleDto, @Param('id') id: string) {
    dto.roleUpdatedAt = new Date();
    const { data, err } = await this.roleService.updateRoleData(dto, id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch('/status/:id')
  @HttpCode(HttpStatus.OK)
  async changeStatusRole(@Param('id') id: string) {
    const { data, err } = await this.roleService.changeStatusRole(id);
    if (err) {
      console.log('error', err);
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteRole(@Param('id') id: string) {
    const { data, err } = await this.roleService.deleteRoleData(id);
    if (err) {
      console.log('error', err);
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}
