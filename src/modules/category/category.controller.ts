import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CategoriesService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation } from '@nestjs/swagger';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create categories' })
  @UseGuards(AuthGuard('admin'))
  @Post()
  async createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @getUser() user,
  ) {
    createCategoryDto.createdAt = new Date();
    createCategoryDto.createdBy = user.userId;
    createCategoryDto.updatedAt = new Date();
    createCategoryDto.updatedBy = user.userId;
    const { data } = await this.categoriesService.createCategory(createCategoryDto);

  return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard(['user', 'admin']))
  // @UseGuards(AuthGuard(['user', 'admin']))
  @Get()
  async listCategories(@Query('status') status?: string) {
    const { data, err } =
      await this.categoriesService.findAllCategories(status);
    if (err) errorResponseBuilder(err);
    return responseBuilder(true, data);
  }

  // find all categories for admin with pagination and search
  @UseGuards(AuthGuard(['user', 'admin']))
  @Get('admin')
  async listCategoriesForAdmin(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const { data, err } = await this.categoriesService.findAllCategoriesForAdmin({ status, search, page: Number(page), limit: Number(limit) },);
    if (err) errorResponseBuilder(err);
    return responseBuilder(true, data);
  }


  @UseGuards(AuthGuard(['user','admin']))
  @Get('allcategories')
  @HttpCode(HttpStatus.OK)
  async getAllCategory() {
    const { data, err } = await this.categoriesService.getAllCategories();
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Get('minimal')
  @HttpCode(HttpStatus.OK)
  async getAllCategoryMinimal() {
    const { data, err } = await this.categoriesService.getAllCategories();
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }


  @UseGuards(AuthGuard('admin'))
  @Patch(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const { data, err } = await this.categoriesService.updateCategory(
      id,
      updateCategoryDto,
    );
    if (err) errorResponseBuilder(err);
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch('/status/:id')
  async statusChangeCategory(@Param('id') id: string) {
    const { data, err } = await this.categoriesService.statusChangeCategory(id);
    if (err) errorResponseBuilder(err);
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Delete(':id')
  async deleteCategory(@Param('id') id: string) {
    const { data, err } = await this.categoriesService.deleteCategory(id);
    if (err) errorResponseBuilder(err);
    return responseBuilder(true, data);
  }
}
