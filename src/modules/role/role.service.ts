import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from './schema/role.schema';
import { RoleDto } from './dto/role.dto';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { User } from '../user/schema/user.schema';
import { StatusType } from 'src/common/enum/status-type.enum';

@Injectable()
export class RoleService {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  // Create Role
  async createRoleData(dto: RoleDto): Promise<{ data: any; err: any }> {
    try {
      console.log('role dto', dto);

      // Check for duplicate role name
      // const existingRole = await this.roleModel
      //   .findOne({ roleName: dto.roleName })
      //   .exec();
      // if (existingRole) {
      //   throw new ConflictException('Role name already exists');
      // }

      const role = new this.roleModel(dto);
      await role.save();
      return { data: role, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  // Update Role
  async updateRoleData(
    dto: RoleDto,
    id: string,
  ): Promise<{ data: any; err: any }> {
    try {
      const role = await this.roleModel
        .findByIdAndUpdate(
          id,
          { $set: dto },
          { new: true, runValidators: true },
        )
        .exec();

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      return { data: role, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  // Get a Single Role by ID
  async getRole(id: string): Promise<{ data: any; err: any }> {
    try {
      const role = await this.roleModel.findById(id).exec();
      if (!role) {
        throw new NotFoundException('Role not found');
      }
      return { data: role, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  // async getAllRoles(startIndex = 0, noOfItems = 4, search = '') {
  //   try {
  //     const condObj: any = {
  //       roleName: { $nin: ['admin', 'user'] }
  //     };

  //     if (search) {
  //       condObj.roleName = { $regex: search, $options: 'i' };
  //     }

  //     const totalCount = await this.roleModel.countDocuments(condObj);

  //     const roles = await this.roleModel
  //       .find(condObj)
  //       .skip(startIndex)
  //       .limit(noOfItems)
  //       .exec();

  //     return { data: { roles, totalCount }, err: null };
  //   } catch (err) {
  //     return { data: null, totalCount: 0, err };
  //   }
  // }

  //Get All Roles
  async getAllRoles(): Promise<{ data: any; err: any }> {
    try {
      const roles = await this.roleModel
        .find({ roleName: { $nin: ['admin'] } })
        .exec();

      return { data: roles, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  async changeStatusRole(id: string): Promise<{ data: any; err: any }> {
    try {
      const role = await this.roleModel.findById(id);

      if (!role) {
        return { data: null, err: `Role with ID ${id} not found.` };
      }

      // Toggle status
      const newStatus =
        role.status === StatusType.ACTIVE
          ? StatusType.INACTIVE
          : StatusType.ACTIVE;

      // Update the status in the database
      const updatedRole = await this.roleModel.findByIdAndUpdate(
        id,
        { $set: { status: newStatus } },
        { new: true },
      );

      return { data: updatedRole, err: null };
    } catch (err) {
      console.error('Error changing role status:', err);
      return {
        data: null,
        err: err instanceof Error ? err.message : 'Internal Server Error',
      };
    }
  }

  async deleteRoleData(id: string): Promise<{ data: any; err: any }> {
    try {
      const roleId = new mongoose.Types.ObjectId(id);

      // Check if any user is assigned this role
      const userExistInRole = await this.userModel.findOne({ roleId });

      if (userExistInRole) {
        return {
          data: null,
          err: 'Users with this role need to be removed first.',
        };
      }

      // Perform a soft delete by updating status
      const deletedRole = await this.roleModel.findByIdAndUpdate(
        id,
        { $set: { status: StatusType.DELETED } },
        { new: true },
      );

      if (!deletedRole) {
        return { data: null, err: `Role with ID ${id} not found.` };
      }

      return { data: { message: 'Role deleted successfully' }, err: null };
    } catch (err) {
      console.error('Error deleting role:', err);
      return {
        data: null,
        err: err instanceof Error ? err.message : 'Internal Server Error',
      };
    }
  }

  async getAllRolesByAdmin() {
    try {
      const roles = await this.roleModel
        .find({ roleName: { $nin: ['admin'] }, status: 'ACTIVE' })
        .exec();

      return { data: roles, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  async getUserRole() {
    try {
      const roleUser = await this.roleModel.find({ roleName: 'user' }).exec();
      return { data: roleUser, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }
}
