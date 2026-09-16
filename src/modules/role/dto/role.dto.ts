import { IsString, IsNotEmpty, IsArray, IsEnum } from 'class-validator';
import { RolePrevileges } from 'src/common/enum/rolePrevilage.enum';

export class RoleDto {
  @IsString()
  @IsNotEmpty()
  roleName: string;

  @IsNotEmpty()
  @IsArray()
  @IsEnum(RolePrevileges, { each: true })
  rolePrivileges: RolePrevileges[];

  roleCreatedAt: Date;

  roleUpdatedAt: Date;
}
