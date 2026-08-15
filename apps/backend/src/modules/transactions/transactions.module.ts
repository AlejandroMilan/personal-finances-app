import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from '../accounts/accounts.module';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { TRANSACTION_REPOSITORY } from './application/ports/transaction.repository';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { DeleteTransactionUseCase } from './application/use-cases/delete-transaction.use-case';
import { ListTransactionsUseCase } from './application/use-cases/list-transactions.use-case';
import { UpdateTransactionUseCase } from './application/use-cases/update-transaction.use-case';
import {
  TransactionModel,
  TransactionSchema,
} from './infrastructure/persistence/transaction.schema';
import { MongoTransactionRepository } from './infrastructure/persistence/transaction.repository.mongo';
import { TransactionsController } from './presentation/transactions.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: TransactionModel.name, schema: TransactionSchema },
    ]),
    forwardRef(() => AccountsModule),
    forwardRef(() => CategoriesModule),
  ],
  controllers: [TransactionsController],
  providers: [
    CreateTransactionUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
    ListTransactionsUseCase,
    { provide: TRANSACTION_REPOSITORY, useClass: MongoTransactionRepository },
  ],
  exports: [TRANSACTION_REPOSITORY],
})
export class TransactionsModule {}
