import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ACCOUNT_REPOSITORY, AccountRepository } from './application/ports/account.repository';
import {
  CREDIT_CARD_REPOSITORY,
  CreditCardRepository,
} from './application/ports/credit-card.repository';
import { CreateAccountUseCase } from './application/use-cases/create-account.use-case';
import { DeleteAccountUseCase } from './application/use-cases/delete-account.use-case';
import { ListAccountsUseCase } from './application/use-cases/list-accounts.use-case';
import { UpdateAccountUseCase } from './application/use-cases/update-account.use-case';
import { AccountModel, AccountSchema } from './infrastructure/persistence/account.schema';
import {
  CreditCardModel,
  CreditCardSchema,
} from './infrastructure/persistence/credit-card.schema';
import { MongoAccountRepository } from './infrastructure/persistence/account.repository.mongo';
import { MongoCreditCardRepository } from './infrastructure/persistence/credit-card.repository.mongo';
import { AccountsController } from './presentation/accounts.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: AccountModel.name, schema: AccountSchema },
      { name: CreditCardModel.name, schema: CreditCardSchema },
    ]),
  ],
  controllers: [AccountsController],
  providers: [
    CreateAccountUseCase,
    UpdateAccountUseCase,
    DeleteAccountUseCase,
    ListAccountsUseCase,
    { provide: ACCOUNT_REPOSITORY, useClass: MongoAccountRepository },
    { provide: CREDIT_CARD_REPOSITORY, useClass: MongoCreditCardRepository },
  ],
})
export class AccountsModule {}
