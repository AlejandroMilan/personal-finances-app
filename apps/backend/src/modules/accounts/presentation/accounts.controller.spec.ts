import { Test, TestingModule } from '@nestjs/testing';
import { TOKEN_SERVICE } from '../../auth/application/ports/token-service';
import { AccountType } from '../domain/account-type.enum';
import { Account } from '../domain/entities/account.entity';
import { CreditCard } from '../domain/entities/credit-card.entity';
import { CreateAccountUseCase } from '../application/use-cases/create-account.use-case';
import { DeleteAccountUseCase } from '../application/use-cases/delete-account.use-case';
import { ListAccountsUseCase } from '../application/use-cases/list-accounts.use-case';
import { UpdateAccountUseCase } from '../application/use-cases/update-account.use-case';
import { AccountsController } from './accounts.controller';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

describe('AccountsController', () => {
  let controller: AccountsController;
  const createAccount = { execute: jest.fn() };
  const listAccounts = { execute: jest.fn() };
  const updateAccount = { execute: jest.fn() };
  const deleteAccount = { execute: jest.fn() };

  const user = { id: 'u1', email: 'ana@mail.com' };

  const account = () =>
    Account.restore({
      id: 'a1',
      userId: 'u1',
      name: 'Savings',
      balance: 100,
      color: '#2E6B4F',
      type: AccountType.CASH,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  const card = () =>
    CreditCard.restore({
      id: 'c1',
      accountId: 'a1',
      creditLimit: 5000,
      usedAmount: 1000,
      cutoffDate: new Date('2026-08-15T00:00:00.000Z'),
      paymentDate: new Date('2026-09-05T00:00:00.000Z'),
    });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        { provide: CreateAccountUseCase, useValue: createAccount },
        { provide: ListAccountsUseCase, useValue: listAccounts },
        { provide: UpdateAccountUseCase, useValue: updateAccount },
        { provide: DeleteAccountUseCase, useValue: deleteAccount },
        { provide: TOKEN_SERVICE, useValue: { sign: jest.fn(), verify: jest.fn() } },
      ],
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
  });

  it('creates an account returning its view', async () => {
    createAccount.execute.mockResolvedValue({ account: account(), creditCard: null });
    const dto: CreateAccountDto = {
      name: 'Savings',
      balance: 100,
      color: '#2E6B4F',
      type: AccountType.CASH,
    };

    const response = await controller.create(user, dto);

    expect(createAccount.execute).toHaveBeenCalledWith({
      userId: 'u1',
      name: 'Savings',
      balance: 100,
      color: '#2E6B4F',
      type: AccountType.CASH,
      creditCard: undefined,
    });
    expect(response).toEqual({
      id: 'a1',
      name: 'Savings',
      balance: 100,
      color: '#2E6B4F',
      type: AccountType.CASH,
      creditCard: null,
    });
  });

  it('creates a credit account including the card in the view', async () => {
    createAccount.execute.mockResolvedValue({ account: account(), creditCard: card() });

    const response = await controller.create(user, {
      name: 'Credit',
      balance: 0,
      color: '#D9C5A0',
      type: AccountType.CREDIT,
      creditCard: {
        creditLimit: 5000,
        usedAmount: 1000,
        cutoffDate: '2026-08-15',
        paymentDate: '2026-09-05',
      },
    });

    expect(response.creditCard).toMatchObject({
      id: 'c1',
      creditLimit: 5000,
      usedAmount: 1000,
    });
  });

  it('lists the accounts of the current user', async () => {
    listAccounts.execute.mockResolvedValue([{ account: account(), creditCard: card() }]);

    const response = await controller.list(user);

    expect(listAccounts.execute).toHaveBeenCalledWith('u1');
    expect(response).toHaveLength(1);
    expect(response[0].name).toBe('Savings');
    expect(response[0].creditCard?.creditLimit).toBe(5000);
  });

  it('updates an account returning its view', async () => {
    updateAccount.execute.mockResolvedValue({ account: account(), creditCard: null });
    const dto: UpdateAccountDto = { name: 'Renamed', balance: 200 };

    const response = await controller.update(user, 'a1', dto);

    expect(updateAccount.execute).toHaveBeenCalledWith({
      userId: 'u1',
      accountId: 'a1',
      name: 'Renamed',
      balance: 200,
      color: undefined,
      type: undefined,
      creditCard: undefined,
    });
    expect(response.name).toBe('Savings');
  });

  it('deletes an account', async () => {
    await controller.remove(user, 'a1');

    expect(deleteAccount.execute).toHaveBeenCalledWith({ userId: 'u1', accountId: 'a1' });
  });
});
