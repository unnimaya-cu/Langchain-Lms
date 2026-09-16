import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// import * as bcrypt from 'bcrypt';
import * as argon from 'argon2';

import { Role } from '../../modules/role/schema/role.schema';
import { User } from '../../modules/user/schema/user.schema';
import { RolePrevileges } from '../../common/enum/rolePrevilage.enum';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async seed() {
    try {
      await this.createAdminRoleAndUser();
      this.logger.log(' Database seeding completed successfully');
    } catch (error) {
      this.logger.error(' Error during database seeding:', error);
      throw error;
    }
  }
  private async createAdminRoleAndUser() {
    // 1️⃣ Check if Admin role exists
    let adminRole = await this.roleModel.findOne({ roleName: 'admin' });

    if (!adminRole) {
      adminRole = await this.roleModel.create({
        roleName: 'admin',
        rolePrivileges: Object.values(RolePrevileges),
      });
      this.logger.log(' Admin role created');
    } else {
      this.logger.log('Admin role already exists');
    }

    //  Check if Admin user exists
    const adminEmail = 'admin@avaibe.com';
    const adminUser = await this.userModel.findOne({ email: adminEmail });

    if (!adminUser) {
      const hashedPassword = await argon.hash('avaibe@123');
      await this.userModel.create({
        firstName: 'Super Admin',
        email: adminEmail,
        password: hashedPassword,
        roleId: adminRole._id,
      });
      this.logger.log(' Admin user created');
      this.logger.log(`   Email: ${adminEmail}`);
      this.logger.log(`   Password: avaibe@123`);
    } else {
      this.logger.log('Admin user already exists');
    }
  }
}
