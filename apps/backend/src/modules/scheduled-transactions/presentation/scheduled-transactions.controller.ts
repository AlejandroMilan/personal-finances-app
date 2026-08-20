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
import { Transaction } from '../../transactions/domain/entities/transaction.entity';
import { TransactionView } from '../../transactions/presentation/dto/transaction-response.dto';
import { CancelScheduledTransactionUseCase } from '../application/use-cases/cancel-scheduled-transaction.use-case';
import { CreateScheduledTransactionUseCase } from '../application/use-cases/create-scheduled-transaction.use-case';
import { DeleteScheduledTransactionUseCase } from '../application/use-cases/delete-scheduled-transaction.use-case';
import { ExecuteScheduledTransactionUseCase } from '../application/use-cases/execute-scheduled-transaction.use-case';
import { ListScheduledTransactionsUseCase } from '../application/use-cases/list-scheduled-transactions.use-case';
import { UpdateScheduledTransactionUseCase } from '../application/use-cases/update-scheduled-transaction.use-case';
import { ScheduledTransaction } from '../domain/entities/scheduled-transaction.entity';
import { CreateScheduledTransactionDto } from './dto/create-scheduled-transaction.dto';
import { ExecuteScheduledTransactionDto } from './dto/execute-scheduled-transaction.dto';
import { ListScheduledTransactionsDto } from './dto/list-scheduled-transactions.dto';
import {
  ExecutedScheduledTransactionView,
  ScheduledTransactionView,
} from './dto/scheduled-transaction-response.dto';
import { UpdateScheduledTransactionDto } from './dto/update-scheduled-transaction.dto';

@Controller('scheduled-transactions')
@UseGuards(JwtAuthGuard)
export class ScheduledTransactionsController {
  constructor(
    private readonly createScheduled: CreateScheduledTransactionUseCase,
    private readonly listScheduled: ListScheduledTransactionsUseCase,
    private readonly updateScheduled: UpdateScheduledTransactionUseCase,
    private readonly deleteScheduled: DeleteScheduledTransactionUseCase,
    private readonly executeScheduled: ExecuteScheduledTransactionUseCase,
    private readonly cancelScheduled: CancelScheduledTransactionUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateScheduledTransactionDto,
  ): Promise<ScheduledTransactionView> {
    const scheduled = await this.createScheduled.execute({
      userId: user.id,
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      type: dto.type,
      title: dto.title,
      amount: dto.amount,
      scheduledFor: new Date(dto.scheduledFor),
      recurring: dto.recurring,
      tags: dto.tags,
    });
    return this.toView(scheduled);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: ListScheduledTransactionsDto,
  ): Promise<ScheduledTransactionView[]> {
    const items = await this.listScheduled.execute({
      userId: user.id,
      status: dto.status,
      from: dto.from ? new Date(dto.from) : undefined,
      to: dto.to ? new Date(dto.to) : undefined,
    });
    return items.map((scheduled) => this.toView(scheduled));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateScheduledTransactionDto,
  ): Promise<ScheduledTransactionView> {
    const scheduled = await this.updateScheduled.execute({
      userId: user.id,
      scheduledTransactionId: id,
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      type: dto.type,
      title: dto.title,
      amount: dto.amount,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      recurring: dto.recurring,
      tags: dto.tags,
    });
    return this.toView(scheduled);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteScheduled.execute({
      userId: user.id,
      scheduledTransactionId: id,
    });
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  async execute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ExecuteScheduledTransactionDto,
  ): Promise<ExecutedScheduledTransactionView> {
    const result = await this.executeScheduled.execute({
      userId: user.id,
      scheduledTransactionId: id,
      amount: dto.amount,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : undefined,
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      reschedule: dto.reschedule,
      rescheduleFor: dto.rescheduleFor
        ? new Date(dto.rescheduleFor)
        : undefined,
    });

    return {
      scheduled: this.toView(result.scheduled),
      transaction: this.toTransactionView(result.transaction),
      next: result.next ? this.toView(result.next) : null,
    };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ScheduledTransactionView> {
    const scheduled = await this.cancelScheduled.execute({
      userId: user.id,
      scheduledTransactionId: id,
    });
    return this.toView(scheduled);
  }

  private toView(scheduled: ScheduledTransaction): ScheduledTransactionView {
    return {
      id: scheduled.id,
      accountId: scheduled.accountId,
      categoryId: scheduled.categoryId,
      type: scheduled.type,
      title: scheduled.title,
      amount: scheduled.amount,
      tags: scheduled.tags,
      scheduledFor: scheduled.scheduledFor,
      recurring: scheduled.recurring,
      status: scheduled.status,
      transactionId: scheduled.transactionId,
    };
  }

  private toTransactionView(transaction: Transaction): TransactionView {
    return {
      id: transaction.id,
      accountId: transaction.accountId,
      destinationAccountId: transaction.destinationAccountId,
      categoryId: transaction.categoryId,
      type: transaction.type,
      title: transaction.title,
      amount: transaction.amount,
      timestamp: transaction.timestamp,
      tags: transaction.tags,
    };
  }
}
