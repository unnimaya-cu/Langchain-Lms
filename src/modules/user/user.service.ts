import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import { UpdatePasswordDto, UpdateUserDto, UserDto } from './dto/user.dto';
import { MiscService } from '../misc/misc.service';
import { ModelNames } from 'src/common/enum/model-names.enum';
import * as argon from 'argon2';
import { StatusType } from 'src/common/enum/status-type.enum';
import { ObjectId } from 'mongodb';
import { Types } from 'mongoose';
import { errorResponseBuilder } from 'src/utils/customErrorBuilder';
import { Role } from '../role/schema/role.schema';
import { UserGateway } from './user.gateway';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    private readonly miscService: MiscService,
    private readonly userGateway: UserGateway,
    // private readonly roleService: RoleService,
  ) {}

  async createUser(dto: UserDto) {
    try {
      // console.log('dto', dto);
      const existingEmail = await this.userModel.findOne({
        email: { $regex: `^${dto.email}$`, $options: 'i' },
      });

      if (existingEmail) {
        return {
          data: null,
          err: {
            custom: true,
            message: 'Already exists.',
            fields: ['email'],
            code: 409,
            name: 'ValidationError',
          },
        };
      }

      dto.password = await argon.hash(dto.password);

      const userCode = await this.miscService.getNextSequence(ModelNames.USER);

      const userData = await new this.userModel({
        ...dto,
        roleId: new ObjectId(dto.roleId),
        userCode,
      }).save();

      const { password, ...userWithoutPassword } = userData.toObject();

      return { data: userWithoutPassword, err: null };
    } catch (error) {
      return { data: null, err: error };
    }
  }

  async findAdminAndRole(userId: string) {
    try {
      const user = await this.userModel
        .findById(userId)
        .populate('roleId')
        .select('-password')
        .exec();
      // console.log('user', user);

      return { data: user, err: null };
    } catch (error) {
      return { data: null, err: error };
    }
  }

  async findUserById(id: string) {
    const userObjectId = new mongoose.Types.ObjectId(id);
    try {
      const user = await this.userModel
        .findById(userObjectId)
        .select('-password')
        .exec();

      return { data: user, err: null };
    } catch (error) {
      return { data: null, err: error };
    }
  }

  // async updateUser(
  //   id: string,
  //   updateUserDto: UpdateUserDto,
  // ): Promise<UserDocument | null> {
  //   try {
  //     console.log('updateUserDto', updateUserDto);
  //     const updateUser = await this.userModel
  //       .findByIdAndUpdate(
  //         id,
  //         { $set: updateUserDto, roleId: new ObjectId(updateUserDto.roleId) },
  //         { new: true, runValidators: true },
  //       )
  //       .exec();
  //     console.log('updatee', updateUser);
  //     return updateUser;
  //   } catch (error) {
  //     console.error(error);
  //     throw new Error('An error occurred while updateing user ');
  //   }
  // }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument | null> {
    try {
      // console.log('updateUserDto', updateUserDto);
      // Prepare the update object

      const existingEmail = await this.userModel.findOne({
        _id: { $ne: id },
        email: { $regex: `^${updateUserDto.email}$`, $options: 'i' },
      });

      if (existingEmail) {
        throw new Error('Email already exists.');
      }

      const updateData: any = {
        ...updateUserDto,
      };

      if (updateUserDto.roleId) {
        // console.log('updateUserDto.roleId', updateUserDto.roleId);
        updateData.roleId = new ObjectId(updateUserDto.roleId);
      }

      const updateUser = await this.userModel
        .findByIdAndUpdate(
          id,
          { $set: updateData },
          { new: true, runValidators: true },
        )
        .exec();

      // console.log('updated user', updateUser);

      return updateUser;
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  async getAllUsers(
    startIndex?: string,
    noOfItems?: string,
    search?: string,
    isStatus?: string,
  ) {
    try {
      const condObj: any = {};

      if (isStatus !== undefined) {
        condObj.status = isStatus;
      }

      if (search) {
        condObj.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }
      const role = await this.roleModel.find({ roleName: 'user' });

      // const roleId = new mongoose.Types.ObjectId('67a0a292fa80d942b8fad83c');
      const roleId = role[0]?._id;
      condObj.roleId = roleId;

      // Get total user count
      const totalUsers = await this.userModel.countDocuments(condObj);

      // Convert pagination parameters safely
      const skip = startIndex ? Number(startIndex) : 0;
      const limit = noOfItems ? Number(noOfItems) : 10; // Default limit to 10 if not provided

      // Fetch users
      const users = await this.userModel
        .find(condObj, { password: 0 }) // Exclude password field
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      return { data: { totalUsers, users }, err: null };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { data: null, err: error };
    }
  }

  // async getAllUsers(startIndex?: string, noOfItems?: string, search?: string) {
  //   try {
  //     const condObj: any = {};

  //     if (search) {
  //       condObj.$or = [
  //         { firstName: { $regex: search, $options: 'i' } },
  //         { lastName: { $regex: search, $options: 'i' } },
  //         { email: { $regex: search, $options: 'i' } },
  //       ];
  //     }

  //     const roleId = new mongoose.Types.ObjectId('67a0a292fa80d942b8fad83c');
  //     const totalUsers = await this.userModel.countDocuments(condObj,{match :roleId });

  //     const users = await this.userModel
  //       .find({ ...condObj, roleId }, { password: 0 })
  //       .sort({ createdAt: 1 })
  //       .skip(Number(startIndex))
  //       .limit(Number(noOfItems))
  //       .exec();

  //     return { data: { totalUsers, users }, err: null };
  //   } catch (error) {
  //     console.error('Error fetching courses:', error);
  //     return { data: null, err: error };
  //   }
  // }

  async deleteUser(id: string) {
    try {
      const delUser = await this.userModel
        .findByIdAndUpdate(id, { status: StatusType.DELETED }, { new: true })
        .exec();

      return { data: delUser, err: null };
    } catch (error) {
      console.error(error);
      return { data: null, err: error };
    }
  }

  async userStatusChange(id: string) {
    try {
      const user = await this.userModel.findById(id).exec();
      const newStatus =
        user.status === StatusType.ACTIVE
          ? StatusType.INACTIVE
          : StatusType.ACTIVE;
      const statusChange = await this.userModel
        .findByIdAndUpdate(id, { status: newStatus }, { new: true })
        .exec();

      if (newStatus === 'INACTIVE') {
        this.userGateway.forceLogout(id, 'Account disabled by admin');
      }
      return { data: statusChange, err: null };
    } catch (error) {
      console.error(error);
      return { data: null, err: error };
    }
  }

  async createAdmin(dto: UserDto) {
    try {
      // console.log('dto', dto);
      dto.password = await argon.hash(dto.password);

      const userCode = await this.miscService.getNextSequence(ModelNames.USER);

      const userData = await new this.userModel({
        ...dto,
        roleId: new ObjectId(dto.roleId),
        userCode,
      }).save();
      const { password, ...userWithoutPassword } = userData.toObject();
      return { data: userWithoutPassword, err: null };
    } catch (error) {
      return { data: null, err: error };
    }
  }

  async getAllAdmins(
    startIndex?: string | number,
    noOfItems?: string | number,
    search?: string,
    status?: string,
    privilege?: string
  ) {
    try {
      // console.log('all admin', startIndex, noOfItems, search);

      const condObj: any = {};
      // if (isStatus !== undefined) {
      //   condObj.status = isStatus;
      // }
      if (search) {
        condObj.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }
      if (status &&status !== 'ALL') {
        condObj.status = status;
      }
  
      const role = await this.roleModel.find({ roleName: 'user' });
      const userRoleId = role[0]?._id;

      const adminRole = await this.roleModel.find({ roleName: 'admin' });
      const superAdminRoleId = adminRole[0]?._id;

      // const superAdminRoleId = new mongoose.Types.ObjectId(
      //   '67a0a307fa80d942b8fad840',
      // );

      condObj.roleId = { $nin: [userRoleId, superAdminRoleId] };

      const totalUsers = await this.userModel.countDocuments(condObj);

      const allUsers = await this.userModel
        .find({ ...condObj }, { password: 0 })
        .populate({
          path: 'roleId',
          select: 'roleId roleName rolePrivileges',
        })
        .exec();

      let totalAdmins = allUsers.length;

      if (privilege === 'fullAccess') {
        totalAdmins = allUsers.filter(
          (user) => ((user.roleId as any)?.rolePrivileges?.length || 0) >= 6,
        ).length;
      }

      if (privilege === 'limitedAccess') {
        totalAdmins = allUsers.filter(
          (user) => ((user.roleId as any)?.rolePrivileges?.length || 0) < 6,
        ).length;
      }

      const users = await this.userModel
        .find({ ...condObj }, { password: 0 })
        .populate({path:'roleId',select:'roleId roleName rolePrivileges'})
        .sort({ createdAt: -1 })
        .skip(Number(startIndex))
        .limit(Number(noOfItems))
        .exec();

      let filteredUsers = users;

      if (privilege === 'fullAccess') {
        filteredUsers = users.filter(
          (user) => ((user.roleId as any)?.rolePrivileges?.length || 0) >= 6,
        );
      }

      if (privilege === 'limitedAccess') {
        filteredUsers = users.filter(
          (user) => ((user.roleId as any)?.rolePrivileges?.length || 0) < 6,
        );
      }

      const totalCount = await this.userModel.countDocuments({
        roleId: { $nin: [userRoleId, superAdminRoleId] },
      });

      const activeCount = await this.userModel.countDocuments({
        ...condObj,
        status:StatusType.ACTIVE
      })

      const inactiveCount = await this.userModel.countDocuments({
        ...condObj,
        status:StatusType.INACTIVE
      })

      const deletedCount = await this.userModel.countDocuments({
        ...condObj,
        status:StatusType.DELETED
      })

      return {
        data: { 
          totalAdmins, 
          activeCount,
          inactiveCount,
          deletedCount,
          totalCount,
          adminsList: filteredUsers,
        },
        err: null,
      };
    } catch (error) {
      console.error('Error fetching courses:', error);
      return { data: null, err: error };
    }
  }

  async changePassword(dto: UpdatePasswordDto, userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    try {
      const userData = await this.userModel.findById(userObjectId);
      if (!userData) {
        return errorResponseBuilder({
          custom: true,
          message: 'User not found',
          code: 404,
          name: 'notFound',
        });
      }

      const isPasswordValid = await argon.verify(
        userData.password,
        dto.currentPassword,
      );

      if (!isPasswordValid) {
        return errorResponseBuilder({
          custom: true,
          message: 'Incorrect current password',
          code: 401,
          name: 'incorrect',
        });
      }
      const hashNewPassword = await argon.hash(dto.newPassword);

      const oldPasswords = [
        userData.password,
        ...(userData.oldPasswords || []),
      ];

       const isReused = await Promise.all(
        oldPasswords.map((oldHash) =>
          argon.verify(oldHash, dto.newPassword),
        ),
      ).then((results) => results.some(Boolean));

      if (isReused) {
        return errorResponseBuilder({
          custom: true,
          message: 'New password cannot be same as current or old password',
          code: 400,
          name: 'passwordReuse',
        });
      }

      const changePasswordData = await this.userModel
        .findByIdAndUpdate(
          userObjectId,
          // { password: hashNewPassword, updatedBy: userObjectId },
          {
            $set: {
              password: hashNewPassword,
              updatedBy: userObjectId,
            },
            $push: {
              oldPasswords: userData.password,
            },
          },
          { new: true, runValidators: true },
        )
        .exec();
      return { data: changePasswordData, err: null };
    } catch (err) {
      // console.log("the eerrr", err?.response.error.message);

      return { data: null, err: err };
    }
  }

  async changePasswordAdmin(dto: UpdatePasswordDto, userId: string) {
    try {
      const userData = await this.userModel.findById(
        new Types.ObjectId(userId),
      );
      if (!userData) {
        return { data: null, err: 'User not found' };
      }

      const isMatch = await argon.verify(
        userData.password,
        dto.currentPassword,
      );

      if (!isMatch) {
        return { data: null, err: 'Incorrect old password' };
      }

      const hashNewPassword = await argon.hash(dto.newPassword);
      const changePasswordData = await this.userModel
        .findByIdAndUpdate(
          new Types.ObjectId(userId),
          { password: hashNewPassword, updatedBy: new Types.ObjectId(userId) },
          { new: true, runValidators: true },
        )
        .exec();
      return { data: changePasswordData, err: null };
    } catch (error) {
      return { data: null, err: error };
    }
  }

  async getAllUserMongoId() {
    try {
      const userList = await this.userModel.find({}).select('_id').exec();
      return { data: userList, err: null };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { data: null, err: error };
    }
  }

  async getUserRolesAndPermissions(userId: string) {
    try {
      const userWithRoleDetails = await this.userModel.aggregate([
        {
          $match: { _id: new Types.ObjectId(userId) },
        },
        {
          $lookup: {
            from: 'roles',
            localField: 'roleId',
            foreignField: '_id',
            as: 'roledetails',
          },
        },
        {
          $unwind: '$roledetails',
        },
        {
          $project: {
            roledetails: 1,
          },
        },
      ]);

      if (userWithRoleDetails.length === 0) {
        throw new NotFoundException('User not found or no roles assigned');
      }

      return { data: userWithRoleDetails[0], err: null };
    } catch (error) {
      console.error('Error fetching user roles and permissions:', error);
      return { data: null, err: error };
    }
  }

  // total number of users who joined in a month- monthly chart

  formatToFullYear(dataFromDB, start: Date, end: Date) {
    const months = [];

    let date = new Date(start.getFullYear(), start.getMonth(), 1);
    const endDate = new Date(end.getFullYear(), end.getMonth(), 1);

    while (date <= endDate) {
      months.push({
        month: date.toLocaleString('default', { month: 'long' }),
        count: 0,
      });
      date.setMonth(date.getMonth() + 1);
    }

    // Fill counts
    dataFromDB.forEach(({ month, count }) => {
      if(months[month - 1]) months[month - 1].count = count;
    });

    return months;
  }

  async getMonthlySignUpUsers(startDate: string, endDate: string) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const data = await this.userModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: start,
              $lte: end,
            },
          },
        },
        {
          $lookup: {
            from: 'roles',
            localField: 'roleId',
            foreignField: '_id',
            as: 'role',
          },
        },
        {
          $unwind: '$role',
        },
        {
          $match: {
            'role.roleName': 'user',
          },
        },
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            month: '$_id',
            count: 1,
            _id: 0,
          },
        },
        {
          $sort: { month: 1 },
        },
      ]);
      // console.log('chartdata', data);
      const allData = this.formatToFullYear(data, start, end);

      return { data: allData, err: null };
    } catch (error) {
      return { data: null, err: error };
    }
  }

  // daily signup users-chart data

  fillMissingDays(
    data: { date: Date; count: number }[],
    start: Date,
    end: Date,
  ) {
    const result = [];
    const map = new Map(
      data.map((item) => [item.date.toISOString().slice(0, 10), item.count]),
    );

    let current = new Date(start);
    while (current <= end) {
      const key = current.toISOString().slice(0, 10);
      result.push({ date: key, count: map.get(key) || 0 });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  async getDailySignupUsers(startDate: string, endDate: string) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const data = await this.userModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: start,
              $lte: end,
            },
          },
        },
        {
          $lookup: {
            from: 'roles',
            localField: 'roleId',
            foreignField: '_id',
            as: 'role',
          },
        },
        { $unwind: '$role' },
        {
          $match: {
            'role.roleName': 'user',
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
              },
            },
            count: 1,
            _id: 0,
          },
        },
        {
          $sort: { date: 1 },
        },
      ]);

      const filled = this.fillMissingDays(data, start, end);
      return { data: filled, err: null };
    } catch (error) {
      return { data: null, err: error };
    }
  }
}
