import { Model } from 'mongoose';
import { AccountType } from '../../domain/account-type.enum';
import { Account } from '../../domain/entities/account.entity';
import { MongoAccountRepository } from './account.repository.mongo';
import { AccountModel } from './account.schema';

describe('MongoAccountRepository', () => {
  const doc = {
    uuid: 'a1',
    userId: 'u1',
    name: 'Savings',
    balance: 100,
    color: '#2E6B4F',
    type: AccountType.CASH,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  let modelMock: jest.Mock & { findOne: jest.Mock; find: jest.Mock; deleteOne: jest.Mock; findOneAndUpdate: jest.Mock };
  let execMock: jest.Mock;

  beforeEach(() => {
    execMock = jest.fn().mockResolvedValue(doc);
    modelMock = Object.assign(jest.fn(), {
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: execMock }) }),
      deleteOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
    });
  });

  const repo = () => new MongoAccountRepository(modelMock as unknown as Model<AccountModel>);

  it('saves an account mapping the entity to a document', async () => {
    const account = Account.restore({
      id: 'a1',
      userId: 'u1',
      name: 'Savings',
      balance: 100,
      color: '#2E6B4F',
      type: AccountType.CASH,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const saved = await repo().save(account);

    expect(modelMock.findOneAndUpdate).toHaveBeenCalledWith(
      { uuid: 'a1' },
      {
        $set: expect.objectContaining({
          name: 'Savings',
          balance: 100,
          type: AccountType.CASH,
        }),
      },
      { upsert: true, new: true },
    );
    expect(saved.id).toBe('a1');
    expect(saved.balance).toBe(100);
  });

  it('returns an account entity when found by id', async () => {
    const found = await repo().findById('a1');

    expect(modelMock.findOne).toHaveBeenCalledWith({ uuid: 'a1' });
    expect(found?.name).toBe('Savings');
    expect(found?.userId).toBe('u1');
  });

  it('returns null when not found by id', async () => {
    execMock.mockResolvedValue(null);

    await expect(repo().findById('missing')).resolves.toBeNull();
  });

  it('returns the accounts of a user sorted by creation date', async () => {
    execMock.mockResolvedValue([doc]);

    const accounts = await repo().findByUserId('u1');

    expect(modelMock.find).toHaveBeenCalledWith({ userId: 'u1' });
    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe('a1');
  });

  it('deletes an account by id', async () => {
    await repo().delete('a1');

    expect(modelMock.deleteOne).toHaveBeenCalledWith({ uuid: 'a1' });
  });
});
