import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from '../accounts/accounts.module';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { SCHEDULED_TRANSACTION_REPOSITORY } from './application/ports/scheduled-transaction.repository';
import { CancelScheduledTransactionUseCase } from './application/use-cases/cancel-scheduled-transaction.use-case';
import { CreateScheduledTransactionUseCase } from './application/use-cases/create-scheduled-transaction.use-case';
import { DeleteScheduledTransactionUseCase } from './application/use-cases/delete-scheduled-transaction.use-case';
import { ExecuteScheduledTransactionUseCase } from './application/use-cases/execute-scheduled-transaction.use-case';
import { ListScheduledTransactionsUseCase } from './application/use-cases/list-scheduled-transactions.use-case';
import { UpdateScheduledTransactionUseCase } from './application/use-cases/update-scheduled-transaction.use-case';
import { MongoScheduledTransactionRepository } from './infrastructure/persistence/scheduled-transaction.repository.mongo';
import {
  ScheduledTransactionModel,
  ScheduledTransactionSchema,
} from './infrastructure/persistence/scheduled-transaction.schema';
import { ScheduledTransactionsController } from './presentation/scheduled-transactions.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: ScheduledTransactionModel.name,
        schema: ScheduledTransactionSchema,
      },
    ]),
    forwardRef(() => AccountsModule),
    forwardRef(() => CategoriesModule),
    forwardRef(() => TransactionsModule),
  ],
  controllers: [ScheduledTransactionsController],
  providers: [
    CreateScheduledTransactionUseCase,
    ListScheduledTransactionsUseCase,
    UpdateScheduledTransactionUseCase,
    DeleteScheduledTransactionUseCase,
    ExecuteScheduledTransactionUseCase,
    CancelScheduledTransactionUseCase,
    {
      provide: SCHEDULED_TRANSACTION_REPOSITORY,
      useClass: MongoScheduledTransactionRepository,
    },
  ],
  exports: [SCHEDULED_TRANSACTION_REPOSITORY],
})
export class ScheduledTransactionsModule {}
