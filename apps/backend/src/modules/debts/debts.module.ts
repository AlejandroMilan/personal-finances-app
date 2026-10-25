import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CreateDebtUseCase } from './application/use-cases/create-debt.use-case';
import { DeleteDebtUseCase } from './application/use-cases/delete-debt.use-case';
import { GetDebtUseCase } from './application/use-cases/get-debt.use-case';
import { ListDebtMovementsUseCase } from './application/use-cases/list-debt-movements.use-case';
import { ListDebtsUseCase } from './application/use-cases/list-debts.use-case';
import { UpdateDebtUseCase } from './application/use-cases/update-debt.use-case';
import { DEBT_LEDGER } from '../transactions/application/ports/debt-ledger.port';
import { RecordDebtIncreaseUseCase } from './application/use-cases/record-debt-increase.use-case';
import { RecordDebtPaymentUseCase } from './application/use-cases/record-debt-payment.use-case';
import { RevertDebtMovementsUseCase } from './application/use-cases/revert-debt-movements.use-case';
import { DebtLedgerAdapter } from './infrastructure/debt-ledger.adapter';
import { DEBT_MOVEMENT_REPOSITORY } from './application/ports/debt-movement.repository';
import { DEBT_REPOSITORY } from './application/ports/debt.repository';
import {
  DebtMovementModel,
  DebtMovementSchema,
} from './infrastructure/persistence/debt-movement.schema';
import { MongoDebtMovementRepository } from './infrastructure/persistence/debt-movement.repository.mongo';
import {
  DebtModel,
  DebtSchema,
} from './infrastructure/persistence/debt.schema';
import { MongoDebtRepository } from './infrastructure/persistence/debt.repository.mongo';
import { DebtsController } from './presentation/debts.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: DebtModel.name, schema: DebtSchema },
      { name: DebtMovementModel.name, schema: DebtMovementSchema },
    ]),
  ],
  controllers: [DebtsController],
  providers: [
    CreateDebtUseCase,
    GetDebtUseCase,
    ListDebtsUseCase,
    UpdateDebtUseCase,
    DeleteDebtUseCase,
    ListDebtMovementsUseCase,
    RecordDebtPaymentUseCase,
    RecordDebtIncreaseUseCase,
    RevertDebtMovementsUseCase,
    { provide: DEBT_LEDGER, useClass: DebtLedgerAdapter },
    { provide: DEBT_REPOSITORY, useClass: MongoDebtRepository },
    {
      provide: DEBT_MOVEMENT_REPOSITORY,
      useClass: MongoDebtMovementRepository,
    },
  ],
  exports: [DEBT_REPOSITORY, DEBT_MOVEMENT_REPOSITORY, DEBT_LEDGER],
})
export class DebtsModule {}
