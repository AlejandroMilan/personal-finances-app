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
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/infrastructure/security/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../auth/presentation/current-user.decorator';
import { CreateDebtUseCase } from '../application/use-cases/create-debt.use-case';
import { DeleteDebtUseCase } from '../application/use-cases/delete-debt.use-case';
import { GetDebtUseCase } from '../application/use-cases/get-debt.use-case';
import { ListDebtMovementsUseCase } from '../application/use-cases/list-debt-movements.use-case';
import { ListDebtsUseCase } from '../application/use-cases/list-debts.use-case';
import { UpdateDebtUseCase } from '../application/use-cases/update-debt.use-case';
import { CreateDebtDto } from './dto/create-debt.dto';
import { ListDebtMovementsDto } from './dto/list-debt-movements.dto';
import {
  DebtMovementView,
  DebtView,
  toDebtMovementView,
  toDebtView,
} from './dto/debt-response.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';

@Controller('debts')
@UseGuards(JwtAuthGuard)
export class DebtsController {
  constructor(
    private readonly createDebt: CreateDebtUseCase,
    private readonly listDebts: ListDebtsUseCase,
    private readonly getDebt: GetDebtUseCase,
    private readonly updateDebt: UpdateDebtUseCase,
    private readonly deleteDebt: DeleteDebtUseCase,
    private readonly listDebtMovements: ListDebtMovementsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDebtDto,
  ): Promise<DebtView> {
    const debt = await this.createDebt.execute({
      userId: user.id,
      ...dto,
    });
    return toDebtView(debt);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<DebtView[]> {
    const debts = await this.listDebts.execute(user.id);
    return debts.map(toDebtView);
  }

  /** Declarada antes de `:id` para que "movements" no se tome como id. */
  @Get('movements')
  async movements(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDebtMovementsDto,
  ): Promise<DebtMovementView[]> {
    const movements = await this.listDebtMovements.execute({
      userId: user.id,
      debtId: query.debtId,
    });
    return movements.map(toDebtMovementView);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<DebtView> {
    return toDebtView(await this.getDebt.execute(user.id, id));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDebtDto,
  ): Promise<DebtView> {
    const debt = await this.updateDebt.execute({
      userId: user.id,
      debtId: id,
      ...dto,
    });
    return toDebtView(debt);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteDebt.execute(user.id, id);
  }
}
