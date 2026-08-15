import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../auth/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/security/jwt-auth.guard';
import { CreateCategoryUseCase } from '../application/use-cases/create-category.use-case';
import { DeleteCategoryUseCase } from '../application/use-cases/delete-category.use-case';
import { ListCategoriesUseCase } from '../application/use-cases/list-categories.use-case';
import { UpdateCategoryUseCase } from '../application/use-cases/update-category.use-case';
import { Category } from '../domain/entities/category.entity';
import { CategoryView } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(
    private readonly createCategory: CreateCategoryUseCase,
    private readonly listCategories: ListCategoriesUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryView> {
    const category = await this.createCategory.execute({
      userId: user.id,
      name: dto.name,
      color: dto.color,
    });
    return this.toView(category);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<CategoryView[]> {
    const categories = await this.listCategories.execute(user.id);
    return categories.map((category) => this.toView(category));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryView> {
    const category = await this.updateCategory.execute({
      userId: user.id,
      categoryId: id,
      name: dto.name,
      color: dto.color,
    });
    return this.toView(category);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteCategory.execute({ userId: user.id, categoryId: id });
  }

  private toView(category: Category): CategoryView {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
    };
  }
}
