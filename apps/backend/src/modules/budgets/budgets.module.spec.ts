import { ConfigModule } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { UserModel } from '../auth/infrastructure/persistence/user.schema';
import { BUDGET_REPOSITORY } from './application/ports/budget.repository';
import { CreateBudgetUseCase } from './application/use-cases/create-budget.use-case';
import { DeleteBudgetUseCase } from './application/use-cases/delete-budget.use-case';
import { GetBudgetUseCase } from './application/use-cases/get-budget.use-case';
import { ListBudgetsUseCase } from './application/use-cases/list-budgets.use-case';
import { UpdateBudgetUseCase } from './application/use-cases/update-budget.use-case';
import { BudgetModel } from './infrastructure/persistence/budget.schema';
import { BudgetMongoRepository } from './infrastructure/persistence/budget.repository.mongo';
import { BudgetsController } from './presentation/budgets.controller';
import { BudgetsModule } from './budgets.module';

describe('BudgetsModule', () => {
  it('wires the controller, CRUD use cases and repository token without a database', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), BudgetsModule],
    })
      .overrideProvider(getModelToken(BudgetModel.name))
      .useValue({})
      .overrideProvider(getModelToken(UserModel.name))
      .useValue({})
      .compile();

    expect(moduleRef.get(BudgetsController)).toBeInstanceOf(BudgetsController);
    expect(moduleRef.get(CreateBudgetUseCase)).toBeInstanceOf(
      CreateBudgetUseCase,
    );
    expect(moduleRef.get(GetBudgetUseCase)).toBeInstanceOf(GetBudgetUseCase);
    expect(moduleRef.get(ListBudgetsUseCase)).toBeInstanceOf(
      ListBudgetsUseCase,
    );
    expect(moduleRef.get(UpdateBudgetUseCase)).toBeInstanceOf(
      UpdateBudgetUseCase,
    );
    expect(moduleRef.get(DeleteBudgetUseCase)).toBeInstanceOf(
      DeleteBudgetUseCase,
    );
    expect(moduleRef.get(BUDGET_REPOSITORY)).toBeInstanceOf(
      BudgetMongoRepository,
    );
  });
});
