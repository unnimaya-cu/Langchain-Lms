import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schema/category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { StatusType } from 'src/common/enum/status-type.enum';
import { MiscService } from '../misc/misc.service';
import { ModelNames } from 'src/common/enum/model-names.enum';
import { Course } from '../course/schema/course.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    private miscService: MiscService,
  ) {}

  // Create a new category
  async createCategory(createCategoryDto: CreateCategoryDto) {
    try {
      const existingCategory = await this.categoryModel
        .findOne({ name: new RegExp(`^${createCategoryDto.name}$`, 'i') })
        .exec();

      if (existingCategory) {
        // Throwing an HttpException directly
        throw new HttpException(
          `A category with "${createCategoryDto.name}" already exists`,
          HttpStatus.CONFLICT, // 409 Conflict (best practice for duplicates)
        );
      }

      const categoryCode = await this.miscService.getNextSequence(
        ModelNames.CATEGORIE,
      );

      const category = await new this.categoryModel({
        ...createCategoryDto,
        categoryCode,
      }).save();

      return { data: category, err: null };
    } catch (error) {
      console.error('Error creating category:', error);
      throw new HttpException(
        error || 'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Find all categories with optional status filter (active/inactive/deleted)
  async findAllCategories(status?: string) {
    try {
      const filter = status ? { status } : {};
      const categories = await this.categoryModel.find(filter).exec();
      return { data: categories, err: null };
    } catch (error) {
      console.log('Error while getting categories', error);
      return { data: null, err: error };
    }
  }

  // find categories for admin with pagination and search
  async findAllCategoriesForAdmin({
    status,
    search,
    page,
    limit,
  }: {
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    try {
      const filter: any = {};

      if (status) filter.status = status;
      // if (search) filter.name = { $regex: search, $options: 'i' }; // assuming `name` is a field you search on
      if (search) {
        filter.$or = [
          {name: {$regex:search, $options:'i'}},
          {categoryCode: {$regex:search, $options:'i'}},
        ]
      };

      const skip = (page - 1) * limit;

      const [categories, total] = await Promise.all([
        this.categoryModel.find(filter).sort({createdAt: -1}).skip(skip).limit(limit).exec(),
        this.categoryModel.countDocuments(filter),
      ]);

      return {
        data: {
          categories,
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        },
        err: null,
      };
    } catch (error) {
      console.log('Error while getting categories', error);
      return { data: null, err: error };
    }
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto) {
    try {
      const updatedCategory = await this.categoryModel
        .findByIdAndUpdate(
          id,
          { $set: updateCategoryDto },
          { new: true, runValidators: true },
        )
        .exec();

      return { data: updatedCategory, err: null };
    } catch (error) {
      console.error('Error while updating category:', error);
      return { data: null, err: error };
    }
  }

  async statusChangeCategory(id: string) {
    try {
      const user = await this.categoryModel.findById(id).exec();
      const newStatus =
        user.status === StatusType.ACTIVE
          ? StatusType.INACTIVE
          : StatusType.ACTIVE;
      const statusChange = await this.categoryModel
        .findByIdAndUpdate(id, { status: newStatus }, { new: true })
        .exec();

      return { data: statusChange, err: null };
    } catch (error) {
      console.error('Error status change category:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  // async deleteCategory(id: string) {
  //   try {
  //     // Check if any course is linked to this category
  //     const anyCourse = await this.courseModel.countDocuments({
  //       categoryId: id,
  //     });

  //     if (anyCourse > 0) {
  //       return {
  //         data: null,
  //         err: `Cannot delete category as it has ${anyCourse} associated courses.`,
  //       };
  //     }

  //     // Find the category by ID
  //     const category = await this.categoryModel.findById(id);
  //     if (!category) {
  //       return { data: null, err: `Category with ID ${id} not found` };
  //     }

  //     // Perform soft delete by setting status to INACTIVE
  //     category.status = StatusType.DELETED; // Assuming correct enum
  //     const updatedCategory = await category.save();

  //     return { data: updatedCategory, err: null };
  //   } catch (error) {
  //     console.error('Error deleting category:', error);
  //     return { data: null, err: 'Internal Server Error' };
  //   }
  // }

  async getAllCategories() {
    try {
      const data = await this.categoryModel.find({ status: 'ACTIVE' });
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async deleteCategory(id: string) {
    try {
      const data = await this.categoryModel.findByIdAndUpdate(
        id,
        { $set: { status: StatusType.DELETED } },
        { new: true },
      );
      if (!data) {
        return { data: null, error: 'Category not found' };
      }

      await this.courseModel.updateMany(
        { categoryId: id },
        { $set: { status: StatusType.DELETED } },
      );
      return { data: data, error: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }
}
