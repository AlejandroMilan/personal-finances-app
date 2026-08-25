import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/infrastructure/security/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../auth/presentation/current-user.decorator';
import { CreateBudgetUseCase } from '../application/use-cases/create-budget.use-case';
import { DeleteBudgetUseCase } from '../application/use-cases/delete-budget.use-case';
import { GetBudgetTemplateUseCase } from '../application/use-cases/get-budget-template.use-case';
import { GetBudgetUseCase } from '../application/use-cases/get-budget.use-case';
import { ListBudgetsUseCase } from '../application/use-cases/list-budgets.use-case';
import { UpdateBudgetUseCase } from '../application/use-cases/update-budget.use-case';
import type { BudgetItem } from '../domain/budget-item.type';
import { Budget } from '../domain/entities/budget.entity';
import { BudgetItemDto } from './dto/budget-item.dto';
import { BudgetMonthParamDto } from './dto/budget-month-param.dto';
import {
  BudgetItemResponseDto,
  BudgetResponseDto,
} from './dto/budget-response.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ListBudgetsDto } from './dto/list-budgets.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(
    private readonly createBudget: CreateBudgetUseCase,
    private readonly getBudget: GetBudgetUseCase,
    private readonly listBudgets: ListBudgetsUseCase,
    private readonly updateBudget: UpdateBudgetUseCase,
    private readonly deleteBudget: DeleteBudgetUseCase,
    private readonly getBudgetTemplate?: GetBudgetTemplateUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBudgetDto,
  ): Promise<BudgetResponseDto> {
    const budget = await this.createBudget.execute({
      userId: user.id,
      month: dto.month,
      items: this.toItems(dto.items),
    });
    return this.toResponse(budget);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: ListBudgetsDto,
  ): Promise<BudgetResponseDto[]> {
    const budgets = await this.listBudgets.execute({
      userId: user.id,
      from: dto.from,
      to: dto.to,
      limit: dto.limit,
    });
    return budgets.map((budget) => this.toResponse(budget));
  }

  @Get(':month/template')
  async template(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: BudgetMonthParamDto,
  ): Promise<BudgetItemResponseDto[]> {
    if (!this.getBudgetTemplate) {
      throw new InternalServerErrorException(
        'Budget template use case is not configured',
      );
    }

    const items = await this.getBudgetTemplate.execute({
      userId: user.id,
      month: params.month,
    });
    return items.map((item): BudgetItemResponseDto => ({
      categoryId: item.categoryId,
      type: item.type,
      amount: item.amount,
      note: item.note,
    }));
  }

  @Get(':month')
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: BudgetMonthParamDto,
  ): Promise<BudgetResponseDto> {
    const budget = await this.getBudget.execute({
      userId: user.id,
      month: params.month,
    });
    return this.toResponse(budget);
  }

  @Patch(':month')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: BudgetMonthParamDto,
    @Body() dto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    const budget = await this.updateBudget.execute({
      userId: user.id,
      month: params.month,
      items: this.toItems(dto.items),
    });
    return this.toResponse(budget);
  }

  @Delete(':month')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: BudgetMonthParamDto,
  ): Promise<void> {
    await this.deleteBudget.execute({
      userId: user.id,
      month: params.month,
    });
  }

  private toItems(items: BudgetItemDto[]): BudgetItem[] {
    return items.map((item) => ({
      categoryId: item.categoryId,
      type: item.type,
      amount: item.amount,
      note: item.note,
    }));
  }

  private toResponse(budget: Budget): BudgetResponseDto {
    return {
      id: budget.id,
      month: budget.month,
      items: budget.items.map((item): BudgetItemResponseDto => ({
        categoryId: item.categoryId,
        type: item.type,
        amount: item.amount,
        note: item.note,
      })),
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }
}
