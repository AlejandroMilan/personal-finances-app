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
import { AuthenticatedUser, CurrentUser } from '../../auth/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/security/jwt-auth.guard';
import { CreateAccountUseCase } from '../application/use-cases/create-account.use-case';
import { DeleteAccountUseCase } from '../application/use-cases/delete-account.use-case';
import { ListAccountsUseCase } from '../application/use-cases/list-accounts.use-case';
import { UpdateAccountUseCase } from '../application/use-cases/update-account.use-case';
import { Account } from '../domain/entities/account.entity';
import { CreditCard } from '../domain/entities/credit-card.entity';
import { AccountView, CreditCardView } from './dto/account-response.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(
    private readonly createAccount: CreateAccountUseCase,
    private readonly listAccounts: ListAccountsUseCase,
    private readonly updateAccount: UpdateAccountUseCase,
    private readonly deleteAccount: DeleteAccountUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAccountDto,
  ): Promise<AccountView> {
    const { account, creditCard } = await this.createAccount.execute({
      userId: user.id,
      name: dto.name,
      balance: dto.balance,
      color: dto.color,
      type: dto.type,
      creditCard: dto.creditCard
        ? {
            creditLimit: dto.creditCard.creditLimit,
            usedAmount: dto.creditCard.usedAmount,
            cutoffDate: new Date(dto.creditCard.cutoffDate),
            paymentDate: new Date(dto.creditCard.paymentDate),
          }
        : undefined,
    });
    return this.toView(account, creditCard);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<AccountView[]> {
    const items = await this.listAccounts.execute(user.id);
    return items.map(({ account, creditCard }) => this.toView(account, creditCard));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountView> {
    const { account, creditCard } = await this.updateAccount.execute({
      userId: user.id,
      accountId: id,
      name: dto.name,
      balance: dto.balance,
      color: dto.color,
      type: dto.type,
      creditCard: dto.creditCard
        ? {
            creditLimit: dto.creditCard.creditLimit,
            usedAmount: dto.creditCard.usedAmount,
            cutoffDate: dto.creditCard.cutoffDate
              ? new Date(dto.creditCard.cutoffDate)
              : undefined,
            paymentDate: dto.creditCard.paymentDate
              ? new Date(dto.creditCard.paymentDate)
              : undefined,
          }
        : undefined,
    });
    return this.toView(account, creditCard);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteAccount.execute({ userId: user.id, accountId: id });
  }

  private toView(account: Account, creditCard: CreditCard | null): AccountView {
    return {
      id: account.id,
      name: account.name,
      balance: account.balance,
      color: account.color,
      type: account.type,
      creditCard: creditCard ? this.toCreditCardView(creditCard) : null,
    };
  }

  private toCreditCardView(card: CreditCard): CreditCardView {
    return {
      id: card.id,
      creditLimit: card.creditLimit,
      usedAmount: card.usedAmount,
      cutoffDate: card.cutoffDate,
      paymentDate: card.paymentDate,
    };
  }
}
