import { ConfigModule } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ScheduledTransactionsController } from './presentation/scheduled-transactions.controller';
import { ScheduledTransactionModel } from './infrastructure/persistence/scheduled-transaction.schema';
import { ScheduledTransactionsModule } from './scheduled-transactions.module';
import { SCHEDULED_TRANSACTION_REPOSITORY } from './application/ports/scheduled-transaction.repository';
import { MongoScheduledTransactionRepository } from './infrastructure/persistence/scheduled-transaction.repository.mongo';
import { TransactionModel } from '../transactions/infrastructure/persistence/transaction.schema';
import { AccountModel } from '../accounts/infrastructure/persistence/account.schema';
import { CreditCardModel } from '../accounts/infrastructure/persistence/credit-card.schema';
import { CategoryModel } from '../categories/infrastructure/persistence/category.schema';
import { UserModel } from '../auth/infrastructure/persistence/user.schema';

describe('ScheduledTransactionsModule', () => {
  it('wires the controller and the repository token', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduledTransactionsModule,
      ],
    })
      .overrideProvider(getModelToken(ScheduledTransactionModel.name))
      .useValue({})
      .overrideProvider(getModelToken(TransactionModel.name))
      .useValue({})
      .overrideProvider(getModelToken(AccountModel.name))
      .useValue({})
      .overrideProvider(getModelToken(CreditCardModel.name))
      .useValue({})
      .overrideProvider(getModelToken(CategoryModel.name))
      .useValue({})
      .overrideProvider(getModelToken(UserModel.name))
      .useValue({})
      .compile();

    expect(moduleRef.get(ScheduledTransactionsController)).toBeInstanceOf(
      ScheduledTransactionsController,
    );
    expect(moduleRef.get(SCHEDULED_TRANSACTION_REPOSITORY)).toBeInstanceOf(
      MongoScheduledTransactionRepository,
    );
  });
});
