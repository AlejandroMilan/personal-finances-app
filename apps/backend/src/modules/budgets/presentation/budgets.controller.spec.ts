import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  RequestMethod,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../auth/infrastructure/security/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/presentation/current-user.decorator';
import { CreateBudgetUseCase } from '../application/use-cases/create-budget.use-case';
import { DeleteBudgetUseCase } from '../application/use-cases/delete-budget.use-case';
import { GetBudgetTemplateUseCase } from '../application/use-cases/get-budget-template.use-case';
import { GetBudgetUseCase } from '../application/use-cases/get-budget.use-case';
import { ListBudgetsUseCase } from '../application/use-cases/list-budgets.use-case';
import { UpdateBudgetUseCase } from '../application/use-cases/update-budget.use-case';
import { Budget, BudgetItemType } from '../domain/entities/budget.entity';
import { BudgetsController } from './budgets.controller';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ListBudgetsDto } from './dto/list-budgets.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

describe('BudgetsController', () => {
  let controller: BudgetsController;
  const createBudget = { execute: jest.fn() };
  const getBudget = { execute: jest.fn() };
  const listBudgets = { execute: jest.fn() };
  const updateBudget = { execute: jest.fn() };
  const deleteBudget = { execute: jest.fn() };
  const getBudgetTemplate = { execute: jest.fn() };

  const user: AuthenticatedUser = { id: 'token-user', email: 'ana@mail.com' };
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const updatedAt = new Date('2026-01-02T00:00:00.000Z');

  const budget = (
    items = [
      {
        categoryId: 'c1',
        type: BudgetItemType.EXPENSE,
        amount: 250,
        note: 'Rent',
      },
    ],
  ): Budget =>
    Budget.restore({
      id: 'b1',
      userId: 'token-user',
      month: '2026-08',
      items,
      createdAt,
      updatedAt,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BudgetsController(
      createBudget as unknown as CreateBudgetUseCase,
      getBudget as unknown as GetBudgetUseCase,
      listBudgets as unknown as ListBudgetsUseCase,
      updateBudget as unknown as UpdateBudgetUseCase,
      deleteBudget as unknown as DeleteBudgetUseCase,
      getBudgetTemplate as unknown as GetBudgetTemplateUseCase,
    );
  });

  it('is mounted on /budgets and protected by JwtAuthGuard metadata', () => {
    const path = Reflect.getMetadata(
      PATH_METADATA,
      BudgetsController,
    ) as string;
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      BudgetsController,
    ) as unknown[];

    expect(path).toBe('budgets');
    expect(guards).toContain(JwtAuthGuard);
  });

  it('declares the template GET route before the dynamic month route', () => {
    const prototype = BudgetsController.prototype;
    const methods = Object.getOwnPropertyNames(prototype);

    expect(methods.indexOf('template')).toBeLessThan(methods.indexOf('get'));
    expect(Reflect.getMetadata(PATH_METADATA, prototype.template)).toBe(
      ':month/template',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, prototype.template)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, prototype.get)).toBe(':month');
  });

  it('creates a budget returning the response DTO and takes userId from CurrentUser', async () => {
    const created = budget();
    createBudget.execute.mockResolvedValue(created);
    const dto = {
      month: '2026-08',
      items: [
        {
          categoryId: 'c1',
          type: BudgetItemType.EXPENSE,
          amount: 250,
          note: 'Rent',
        },
      ],
      userId: 'body-user',
    } as unknown as CreateBudgetDto;

    const response = await controller.create(user, dto);

    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        BudgetsController.prototype.create,
      ),
    ).toBe(201);
    expect(createBudget.execute).toHaveBeenCalledWith({
      userId: 'token-user',
      month: '2026-08',
      items: [
        {
          categoryId: 'c1',
          type: BudgetItemType.EXPENSE,
          amount: 250,
          note: 'Rent',
        },
      ],
    });
    expect(response).toEqual({
      id: 'b1',
      month: '2026-08',
      items: [
        {
          categoryId: 'c1',
          type: BudgetItemType.EXPENSE,
          amount: 250,
          note: 'Rent',
        },
      ],
      createdAt,
      updatedAt,
    });
  });

  it('propagates the 409 ConflictException from a duplicate create', async () => {
    const error = new ConflictException('Budget already exists');
    createBudget.execute.mockRejectedValue(error);

    await expect(
      controller.create(user, {
        month: '2026-08',
        items: [],
      }),
    ).rejects.toBe(error);
    expect(error.getStatus()).toBe(409);
  });

  it('lists budgets using query filters but ignores a userId supplied in the query', async () => {
    listBudgets.execute.mockResolvedValue([budget()]);
    const query = {
      from: '2026-01',
      to: '2026-12',
      limit: 50,
      userId: 'query-user',
    } as unknown as ListBudgetsDto;

    const response = await controller.list(user, query);

    expect(listBudgets.execute).toHaveBeenCalledWith({
      userId: 'token-user',
      from: '2026-01',
      to: '2026-12',
      limit: 50,
    });
    expect(response[0]).toEqual({
      id: 'b1',
      month: '2026-08',
      items: [
        {
          categoryId: 'c1',
          type: BudgetItemType.EXPENSE,
          amount: 250,
          note: 'Rent',
        },
      ],
      createdAt,
      updatedAt,
    });
  });

  it('propagates NotFoundException when the requested month has no budget', async () => {
    const error = new NotFoundException('Budget not found');
    getBudget.execute.mockRejectedValue(error);

    await expect(controller.get(user, { month: '2026-08' })).rejects.toBe(
      error,
    );
    expect(getBudget.execute).toHaveBeenCalledWith({
      userId: 'token-user',
      month: '2026-08',
    });
  });

  it('returns the schedule template using the authenticated user and maps its items', async () => {
    const items = [
      {
        categoryId: 'c1',
        type: BudgetItemType.EXPENSE,
        amount: 100,
        note: 'Rent (agenda)',
      },
    ];
    getBudgetTemplate.execute.mockResolvedValue(items);

    await expect(
      controller.template(user, { month: '2026-08' }),
    ).resolves.toEqual(items);

    expect(getBudgetTemplate.execute).toHaveBeenCalledWith({
      userId: 'token-user',
      month: '2026-08',
    });
  });

  it('reports a server error when the template use case is not wired', async () => {
    const withoutTemplateUseCase = new BudgetsController(
      createBudget as unknown as CreateBudgetUseCase,
      getBudget as unknown as GetBudgetUseCase,
      listBudgets as unknown as ListBudgetsUseCase,
      updateBudget as unknown as UpdateBudgetUseCase,
      deleteBudget as unknown as DeleteBudgetUseCase,
    );

    await expect(
      withoutTemplateUseCase.template(user, { month: '2026-08' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('replaces budget items on PATCH and never takes userId from the body', async () => {
    const replacement = [
      {
        categoryId: 'c2',
        type: BudgetItemType.INCOME,
        amount: 3000,
        note: 'Salary',
      },
    ];
    updateBudget.execute.mockResolvedValue(budget(replacement));
    const dto = {
      items: replacement,
      userId: 'body-user',
    } as unknown as UpdateBudgetDto;

    const response = await controller.update(user, { month: '2026-08' }, dto);

    expect(updateBudget.execute).toHaveBeenCalledWith({
      userId: 'token-user',
      month: '2026-08',
      items: replacement,
    });
    expect(response.items).toEqual(replacement);
  });

  it('deletes a budget and declares HTTP 204', async () => {
    await expect(
      controller.remove(user, { month: '2026-08' }),
    ).resolves.toBeUndefined();

    expect(deleteBudget.execute).toHaveBeenCalledWith({
      userId: 'token-user',
      month: '2026-08',
    });
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        BudgetsController.prototype.remove,
      ),
    ).toBe(204);
  });
});
