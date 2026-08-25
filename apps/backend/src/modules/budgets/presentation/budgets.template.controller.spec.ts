import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TOKEN_SERVICE } from '../../auth/application/ports/token-service';
import { JwtAuthGuard } from '../../auth/infrastructure/security/jwt-auth.guard';
import { SCHEDULED_TRANSACTION_REPOSITORY } from '../../scheduled-transactions/application/ports/scheduled-transaction.repository';
import { ScheduledTransaction } from '../../scheduled-transactions/domain/entities/scheduled-transaction.entity';
import { ScheduledTransactionStatus } from '../../scheduled-transactions/domain/scheduled-transaction-status.enum';
import { TransactionType } from '../../transactions/domain/transaction-type.enum';
import { BUDGET_REPOSITORY } from '../application/ports/budget.repository';
import { CreateBudgetUseCase } from '../application/use-cases/create-budget.use-case';
import { DeleteBudgetUseCase } from '../application/use-cases/delete-budget.use-case';
import { GetBudgetTemplateUseCase } from '../application/use-cases/get-budget-template.use-case';
import { GetBudgetUseCase } from '../application/use-cases/get-budget.use-case';
import { ListBudgetsUseCase } from '../application/use-cases/list-budgets.use-case';
import { UpdateBudgetUseCase } from '../application/use-cases/update-budget.use-case';
import { MAX_BUDGET_ITEMS } from '../domain/budget-limits';
import { BudgetsController } from './budgets.controller';

describe('GET /budgets/:month/template', () => {
  let app: INestApplication;

  const verifyToken = jest.fn();
  const tokenService = {
    sign: jest.fn(),
    verify: verifyToken,
  };
  const scheduledRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };
  const budgetRepository = {
    findByMonth: jest.fn(),
    list: jest.fn(),
    save: jest.fn(),
    deleteByMonth: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    verifyToken.mockReturnValue({ sub: 'token-user', email: 'ana@mail.com' });
    scheduledRepository.findByUserId.mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      controllers: [BudgetsController],
      providers: [
        { provide: CreateBudgetUseCase, useValue: { execute: jest.fn() } },
        { provide: GetBudgetUseCase, useValue: { execute: jest.fn() } },
        { provide: ListBudgetsUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateBudgetUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteBudgetUseCase, useValue: { execute: jest.fn() } },
        GetBudgetTemplateUseCase,
        { provide: BUDGET_REPOSITORY, useValue: budgetRepository },
        {
          provide: SCHEDULED_TRANSACTION_REPOSITORY,
          useValue: scheduledRepository,
        },
        { provide: TOKEN_SERVICE, useValue: tokenService },
        { provide: JwtAuthGuard, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with the template and never saves a budget', async () => {
    const scheduledFor = new Date('2026-08-15T00:00:00.000Z');
    scheduledRepository.findByUserId.mockResolvedValue([
      ScheduledTransaction.restore({
        id: 's1',
        userId: 'token-user',
        accountId: 'a1',
        destinationAccountId: null,
        categoryId: 'c1',
        type: TransactionType.EXPENSE,
        title: 'Rent',
        amount: 900,
        tags: [],
        scheduledFor,
        recurring: false,
        status: ScheduledTransactionStatus.PENDING,
        transactionId: null,
        createdAt: scheduledFor,
        updatedAt: scheduledFor,
      }),
    ]);

    const response = await request(app.getHttpServer())
      .get('/budgets/2026-08/template')
      .set('Authorization', 'Bearer template-token')
      .expect(200);

    expect(response.body).toEqual([
      {
        categoryId: 'c1',
        type: 'expense',
        amount: 900,
        note: 'Rent (agenda)',
      },
    ]);
    expect(verifyToken).toHaveBeenCalledWith('template-token');
    expect(scheduledRepository.findByUserId).toHaveBeenCalledWith(
      'token-user',
      {
        status: ScheduledTransactionStatus.PENDING,
        to: new Date('2026-08-31T23:59:59.999Z'),
        limit: MAX_BUDGET_ITEMS + 1,
      },
    );
    expect(budgetRepository.save).not.toHaveBeenCalled();
  });

  it('returns 400 for a schedule overflow and never persists a budget', async () => {
    scheduledRepository.findByUserId.mockResolvedValue(
      Array.from({ length: MAX_BUDGET_ITEMS + 1 }, (_, index) => {
        const scheduledFor = new Date('2026-08-15T00:00:00.000Z');
        return ScheduledTransaction.restore({
          id: `s${index}`,
          userId: 'token-user',
          accountId: 'a1',
          destinationAccountId: null,
          categoryId: `c${index}`,
          type: TransactionType.EXPENSE,
          title: `Item ${index}`,
          amount: 100,
          tags: [],
          scheduledFor,
          recurring: false,
          status: ScheduledTransactionStatus.PENDING,
          transactionId: null,
          createdAt: scheduledFor,
          updatedAt: scheduledFor,
        });
      }),
    );

    const response = await request(app.getHttpServer())
      .get('/budgets/2026-08/template')
      .set('Authorization', 'Bearer template-token')
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 400,
        message: `A budget template cannot contain more than ${MAX_BUDGET_ITEMS} items`,
      }),
    );
    expect(scheduledRepository.findByUserId).toHaveBeenCalledWith(
      'token-user',
      {
        status: ScheduledTransactionStatus.PENDING,
        to: new Date('2026-08-31T23:59:59.999Z'),
        limit: MAX_BUDGET_ITEMS + 1,
      },
    );
    expect(budgetRepository.save).not.toHaveBeenCalled();
  });

  it('returns 400 for a grouped note overflow and never persists a budget', async () => {
    const scheduledFor = new Date('2026-08-15T00:00:00.000Z');
    const scheduled = (id: string, title: string) =>
      ScheduledTransaction.restore({
        id,
        userId: 'token-user',
        accountId: 'a1',
        destinationAccountId: null,
        categoryId: 'c1',
        type: TransactionType.EXPENSE,
        title,
        amount: 100,
        tags: [],
        scheduledFor,
        recurring: false,
        status: ScheduledTransactionStatus.PENDING,
        transactionId: null,
        createdAt: scheduledFor,
        updatedAt: scheduledFor,
      });
    scheduledRepository.findByUserId.mockResolvedValue([
      scheduled('s1', 'x'.repeat(250)),
      scheduled('s2', 'y'.repeat(250)),
    ]);

    const response = await request(app.getHttpServer())
      .get('/budgets/2026-08/template')
      .set('Authorization', 'Bearer template-token')
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 400,
        message: 'A budget template note cannot exceed 500 characters',
      }),
    );
    expect(budgetRepository.save).not.toHaveBeenCalled();
  });

  it('rejects the template endpoint without a bearer token', async () => {
    await request(app.getHttpServer())
      .get('/budgets/2026-08/template')
      .expect(401);

    expect(scheduledRepository.findByUserId).not.toHaveBeenCalled();
    expect(budgetRepository.save).not.toHaveBeenCalled();
  });
});
