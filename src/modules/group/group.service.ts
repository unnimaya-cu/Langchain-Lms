import { Injectable } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Group } from './schema/group.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Group.name)
    private readonly groupModel: Model<Group>,
  ) {}

  async createGroup(dto: CreateGroupDto, userId: string) {
    try {
      const existingGroup = await this.groupModel.findOne({
        courseId: dto.courseId,
        categoryId: dto.categoryId,
        name: { $regex: `^${dto.name}$`, $options: 'i' },
      });

      if (existingGroup) {
        throw {
          custom: true,
          message: 'Group name already exists for this course.',
          code: 400,
          fields: ['name'],
        };
      }

      const normalizedStudents = dto.studentIds
        .map((id) => new Types.ObjectId(id))
        .sort((a, b) => a.toString().localeCompare(b.toString()));

      const sameStudentsGroup = await this.groupModel.findOne({
        name: { $regex: `^${dto.name}$`, $options: 'i' },
        courseId: dto.courseId,
        categoryId: dto.categoryId,
        studentIds: {
          $all: normalizedStudents,
          $size: normalizedStudents.length,
        },
      });

      if (sameStudentsGroup) {
        throw {
          custom: true,
          message: 'A group with the same students already exists.',
          code: 400,
          fields: ['students'],
        };
      }

      const data = await this.groupModel.create({
        ...dto,
        createdBy: userId,
        updatedBy: userId,
      });

      return { data: data, err: null };
    } catch (error) {
      return { data: null, err: error };
    }
  }

  async getGroups(
    courseId: string,
    categoryId: string,
    startIndex?: number,
    noOfItems?: number,
    search?: string
  ) {

    try{
      const searchQuery: any = [
        {
          $match:{
            categoryId: new Types.ObjectId(categoryId),
            courseId: new Types.ObjectId(courseId),
          }
        }
      ]

      if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedSearch, 'i');
        searchQuery.push({
          $match: {
            name: {$regex: searchRegex},
          },
        });
      }

      const groups = await this.groupModel.aggregate([
        ...searchQuery,
        {$sort:{name: 1}},
        {$skip: startIndex || 0},
        {$limit: noOfItems || 10},
        {
          $project: {
            _id:1,
            name: 1,
            studentIds: 1,
            status: 1
          }
        }
      ])

      return { data: groups, err: null};
    } catch (error) {
      return {data: null, err: error};
    }
  }
}
