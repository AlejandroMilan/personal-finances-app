import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { BUDGET_REPOSITORY } from './application/ports/budget.repository';
import { CreateBudgetUseCase } from './application/use-cases/create-budget.use-case';
import { DeleteBudgetUseCase } from './application/use-cases/delete-budget.use-case';
import { GetBudgetUseCase } from './application/use-cases/get-budget.use-case';
import { ListBudgetsUseCase } from './application/use-cases/list-budgets.use-case';
import { UpdateBudgetUseCase } from './application/use-cases/update-budget.use-case';
import { BudgetMongoRepository } from './infrastructure/persistence/budget.repository.mongo';
import {
  BudgetModel,
  BudgetSchema,
} from './infrastructure/persistence/budget.schema';
import { BudgetsController } from './presentation/budgets.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: BudgetModel.name, schema: BudgetSchema },
    ]),
  ],
  controllers: [BudgetsController],
  providers: [
    CreateBudgetUseCase,
    GetBudgetUseCase,
    ListBudgetsUseCase,
    UpdateBudgetUseCase,
    DeleteBudgetUseCase,
    { provide: BUDGET_REPOSITORY, useClass: BudgetMongoRepository },
  ],
  exports: [BUDGET_REPOSITORY],
})
export class BudgetsModule {}
