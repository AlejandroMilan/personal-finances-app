import { Model } from 'mongoose';
import { CreditCard } from '../../domain/entities/credit-card.entity';
import { MongoCreditCardRepository } from './credit-card.repository.mongo';
import { CreditCardModel } from './credit-card.schema';

describe('MongoCreditCardRepository', () => {
  const doc = {
    uuid: 'c1',
    accountId: 'a1',
    creditLimit: 5000,
    usedAmount: 1000,
    cutoffDate: new Date('2026-08-15T00:00:00.000Z'),
    paymentDate: new Date('2026-09-05T00:00:00.000Z'),
  };

  let modelMock: jest.Mock & { findOne: jest.Mock; find: jest.Mock; deleteMany: jest.Mock; findOneAndUpdate: jest.Mock };
  let execMock: jest.Mock;

  beforeEach(() => {
    execMock = jest.fn().mockResolvedValue(doc);
    modelMock = Object.assign(jest.fn(), {
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue({ exec: execMock }),
      deleteMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
    });
  });

  const repo = () =>
    new MongoCreditCardRepository(modelMock as unknown as Model<CreditCardModel>);

  it('saves a credit card mapping the entity to a document', async () => {
    const card = CreditCard.restore({
      id: 'c1',
      accountId: 'a1',
      creditLimit: 5000,
      usedAmount: 1000,
      cutoffDate: new Date('2026-08-15T00:00:00.000Z'),
      paymentDate: new Date('2026-09-05T00:00:00.000Z'),
    });

    const saved = await repo().save(card);

    expect(modelMock.findOneAndUpdate).toHaveBeenCalledWith(
      { uuid: 'c1' },
      {
        $set: expect.objectContaining({
          accountId: 'a1',
          creditLimit: 5000,
        }),
      },
      { upsert: true, new: true },
    );
    expect(saved.id).toBe('c1');
    expect(saved.creditLimit).toBe(5000);
  });

  it('returns a credit card entity when found by account id', async () => {
    const found = await repo().findByAccountId('a1');

    expect(modelMock.findOne).toHaveBeenCalledWith({ accountId: 'a1' });
    expect(found?.usedAmount).toBe(1000);
  });

  it('returns null when no card exists for the account', async () => {
    execMock.mockResolvedValue(null);

    await expect(repo().findByAccountId('missing')).resolves.toBeNull();
  });

  it('returns the cards of the given accounts', async () => {
    execMock.mockResolvedValue([doc]);

    const cards = await repo().findByAccountIds(['a1', 'a2']);

    expect(modelMock.find).toHaveBeenCalledWith({ accountId: { $in: ['a1', 'a2'] } });
    expect(cards).toHaveLength(1);
    expect(cards[0].accountId).toBe('a1');
  });

  it('deletes the cards of an account', async () => {
    await repo().deleteByAccountId('a1');

    expect(modelMock.deleteMany).toHaveBeenCalledWith({ accountId: 'a1' });
  });
});
