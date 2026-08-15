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
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../auth/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/security/jwt-auth.guard';
import { CreateTransactionUseCase } from '../application/use-cases/create-transaction.use-case';
import { DeleteTransactionUseCase } from '../application/use-cases/delete-transaction.use-case';
import { ListTransactionsUseCase } from '../application/use-cases/list-transactions.use-case';
import { UpdateTransactionUseCase } from '../application/use-cases/update-transaction.use-case';
import { Transaction } from '../domain/entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import {
  PaginatedTransactionsView,
  TransactionView,
} from './dto/transaction-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly listTransactions: ListTransactionsUseCase,
    private readonly updateTransaction: UpdateTransactionUseCase,
    private readonly deleteTransaction: DeleteTransactionUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionView> {
    const transaction = await this.createTransaction.execute({
      userId: user.id,
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      type: dto.type,
      title: dto.title,
      amount: dto.amount,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : undefined,
      tags: dto.tags,
    });
    return this.toView(transaction);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: ListTransactionsDto,
  ): Promise<PaginatedTransactionsView> {
    const result = await this.listTransactions.execute(user.id, {
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      type: dto.type,
      title: dto.title,
      tags: this.parseTags(dto.tags),
      from: dto.from ? new Date(dto.from) : undefined,
      to: dto.to ? new Date(dto.to) : undefined,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    });

    return {
      items: result.items.map((transaction) => this.toView(transaction)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionView> {
    const transaction = await this.updateTransaction.execute({
      userId: user.id,
      transactionId: id,
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      type: dto.type,
      title: dto.title,
      amount: dto.amount,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : undefined,
      tags: dto.tags,
    });
    return this.toView(transaction);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteTransaction.execute({
      userId: user.id,
      transactionId: id,
    });
  }

  private parseTags(tags: string | undefined): string[] | undefined {
    if (!tags) {
      return undefined;
    }
    const parsed = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    return parsed.length > 0 ? parsed : undefined;
  }

  private toView(transaction: Transaction): TransactionView {
    return {
      id: transaction.id,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      type: transaction.type,
      title: transaction.title,
      amount: transaction.amount,
      timestamp: transaction.timestamp,
      tags: transaction.tags,
    };
  }
}
